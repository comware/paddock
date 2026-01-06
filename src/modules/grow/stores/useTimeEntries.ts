/**
 * useTimeEntries - Zustand store for time tracking
 *
 * Tracks time spent on microgreens activities by category.
 * Provides daily/weekly totals and category breakdowns.
 */

import { create } from 'zustand';
import { growDb, type GrowTimeEntry } from '@/lib/db';
import { startOfDay, startOfWeek, endOfWeek, isWithinInterval, format, getISOWeek, isSameDay } from 'date-fns';

// ============================================
// TYPES
// ============================================

export type TimeCategory =
  | 'wateringChecking'
  | 'sowing'
  | 'harvesting'
  | 'packaging'
  | 'cleanup'
  | 'researchLearning'
  | 'other';

export const TIME_CATEGORIES: { value: TimeCategory; label: string; icon: string }[] = [
  { value: 'wateringChecking', label: 'Watering & Checking', icon: '💧' },
  { value: 'sowing', label: 'Sowing', icon: '🌱' },
  { value: 'harvesting', label: 'Harvesting', icon: '✂️' },
  { value: 'packaging', label: 'Packaging', icon: '📦' },
  { value: 'cleanup', label: 'Cleanup', icon: '🧹' },
  { value: 'researchLearning', label: 'Research & Learning', icon: '📚' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export interface CategoryTotal {
  category: TimeCategory;
  label: string;
  icon: string;
  minutes: number;
  percentage: number;
}

export interface TimeEntriesState {
  entries: GrowTimeEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEntries: () => Promise<void>;
  getTodaysEntry: () => GrowTimeEntry | null;
  saveTimeEntry: (data: Partial<GrowTimeEntry>) => Promise<string>;
  addTimeToCategory: (category: TimeCategory, minutes: number) => Promise<void>;
  updateEntry: (id: string, updates: Partial<GrowTimeEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // Selectors
  getTodaysTotal: () => number;
  getThisWeeksTotal: () => number;
  getWeeklyTarget: () => number;
  getCategoryTotals: (period?: 'today' | 'week' | 'all') => CategoryTotal[];
  getDailyTotals: (days?: number) => { date: string; minutes: number }[];
}

// Weekly target in minutes (8-10 hours = 480-600 minutes)
const WEEKLY_TARGET_MINUTES = 540; // 9 hours middle ground

// ============================================
// HELPERS
// ============================================

function getEntryTotal(entry: GrowTimeEntry): number {
  return (
    (entry.wateringChecking || 0) +
    (entry.sowing || 0) +
    (entry.harvesting || 0) +
    (entry.packaging || 0) +
    (entry.cleanup || 0) +
    (entry.researchLearning || 0) +
    (entry.other || 0)
  );
}

// ============================================
// STORE
// ============================================

export const useTimeEntries = create<TimeEntriesState>((set, get) => ({
  entries: [],
  isLoading: true,
  error: null,

  // Load entries from database
  loadEntries: async () => {
    try {
      const entries = await growDb.timeEntries.toArray();
      // Sort by date descending
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      set({ entries, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Get today's entry (one per day)
  getTodaysEntry: () => {
    const { entries } = get();
    const today = startOfDay(new Date());
    return entries.find((e) => isSameDay(new Date(e.date), today)) || null;
  },

  // Save or update today's time entry
  saveTimeEntry: async (data) => {
    const { entries } = get();
    const today = startOfDay(new Date());
    const existing = entries.find((e) => isSameDay(new Date(e.date), today));

    const now = new Date();

    if (existing) {
      // Update existing entry
      await get().updateEntry(existing.id!, data);
      return existing.id!;
    } else {
      // Create new entry
      const entry: Omit<GrowTimeEntry, 'id'> = {
        date: today,
        week: getISOWeek(today),
        wateringChecking: data.wateringChecking || 0,
        sowing: data.sowing || 0,
        harvesting: data.harvesting || 0,
        packaging: data.packaging || 0,
        cleanup: data.cleanup || 0,
        researchLearning: data.researchLearning || 0,
        other: data.other || 0,
        notes: data.notes || '',
        createdAt: now,
        updatedAt: now,
      };

      try {
        const id = await growDb.timeEntries.add(entry as GrowTimeEntry);
        const newEntry = { ...entry, id: String(id) } as GrowTimeEntry;
        set((state) => ({
          entries: [newEntry, ...state.entries],
        }));
        return String(id);
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      }
    }
  },

  // Quick add time to a category for today
  addTimeToCategory: async (category, minutes) => {
    const todaysEntry = get().getTodaysEntry();

    if (todaysEntry) {
      const currentValue = (todaysEntry[category] as number) || 0;
      await get().updateEntry(todaysEntry.id!, {
        [category]: currentValue + minutes,
      });
    } else {
      await get().saveTimeEntry({
        [category]: minutes,
      });
    }
  },

  // Update entry
  updateEntry: async (id, updates) => {
    const updatedData = { ...updates, updatedAt: new Date() };

    try {
      await growDb.timeEntries.update(id, updatedData);
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, ...updatedData } : e
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete entry
  deleteEntry: async (id) => {
    try {
      await growDb.timeEntries.delete(id);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Get today's total minutes
  getTodaysTotal: () => {
    const todaysEntry = get().getTodaysEntry();
    return todaysEntry ? getEntryTotal(todaysEntry) : 0;
  },

  // Get this week's total minutes
  getThisWeeksTotal: () => {
    const { entries } = get();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return entries
      .filter((e) =>
        isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
      )
      .reduce((sum, e) => sum + getEntryTotal(e), 0);
  },

  // Get weekly target
  getWeeklyTarget: () => WEEKLY_TARGET_MINUTES,

  // Get category breakdown
  getCategoryTotals: (period = 'week') => {
    const { entries } = get();
    let filtered = entries;

    if (period === 'today') {
      const todaysEntry = get().getTodaysEntry();
      filtered = todaysEntry ? [todaysEntry] : [];
    } else if (period === 'week') {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      filtered = entries.filter((e) =>
        isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
      );
    }

    // Sum up each category
    const totals: Record<TimeCategory, number> = {
      wateringChecking: 0,
      sowing: 0,
      harvesting: 0,
      packaging: 0,
      cleanup: 0,
      researchLearning: 0,
      other: 0,
    };

    for (const entry of filtered) {
      totals.wateringChecking += entry.wateringChecking || 0;
      totals.sowing += entry.sowing || 0;
      totals.harvesting += entry.harvesting || 0;
      totals.packaging += entry.packaging || 0;
      totals.cleanup += entry.cleanup || 0;
      totals.researchLearning += entry.researchLearning || 0;
      totals.other += entry.other || 0;
    }

    const totalMinutes = Object.values(totals).reduce((a, b) => a + b, 0);

    return TIME_CATEGORIES.map((cat) => ({
      category: cat.value,
      label: cat.label,
      icon: cat.icon,
      minutes: totals[cat.value],
      percentage: totalMinutes > 0
        ? Math.round((totals[cat.value] / totalMinutes) * 100)
        : 0,
    })).filter((c) => c.minutes > 0);
  },

  // Get daily totals for charting
  getDailyTotals: (days = 7) => {
    const { entries } = get();
    const totals = new Map<string, number>();

    // Initialize last N days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = format(startOfDay(date), 'yyyy-MM-dd');
      totals.set(key, 0);
    }

    // Sum up entries
    for (const entry of entries) {
      const key = format(startOfDay(new Date(entry.date)), 'yyyy-MM-dd');
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) || 0) + getEntryTotal(entry));
      }
    }

    // Convert to array and reverse for chronological order
    return Array.from(totals.entries())
      .map(([date, minutes]) => ({
        date: format(new Date(date), 'EEE'),
        minutes,
      }))
      .reverse();
  },
}));
