/**
 * useTrayComments - Zustand store for tray comment management
 *
 * Manages comments on individual trays with Dexie persistence.
 * Supports CRUD operations with timestamped entries.
 */

import { create } from 'zustand';
import { growDb, toKey, toId, withId, type GrowTrayComment } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface TrayCommentsState {
  // Comments for the currently viewed tray
  comments: GrowTrayComment[];
  isLoading: boolean;
  error: string | null;
  currentTrayId: string | null;

  // Actions
  loadComments: (trayId: string) => Promise<void>;
  addComment: (trayId: string, content: string) => Promise<string>;
  updateComment: (id: string, content: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  clearComments: () => void;
}

// ============================================
// STORE
// ============================================

export const useTrayComments = create<TrayCommentsState>((set, get) => ({
  comments: [],
  isLoading: false,
  error: null,
  currentTrayId: null,

  // Load comments for a specific tray
  loadComments: async (trayId: string) => {
    set({ isLoading: true, currentTrayId: trayId });

    try {
      // Ids are strings above the database boundary; see src/lib/db/keys.ts.
      const comments = (
        await growDb.trayComments
          .where('trayId')
          .equals(trayId)
          .sortBy('createdAt')
      ).map(withId);

      set({ comments, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Add a new comment to a tray
  addComment: async (trayId: string, content: string) => {
    const now = new Date();
    const comment: Omit<GrowTrayComment, 'id'> = {
      trayId,
      content,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const id = await growDb.trayComments.add(comment as GrowTrayComment);
      const newComment = { ...comment, id: toId(id) } as GrowTrayComment;

      // Only update state if we're still viewing the same tray
      if (get().currentTrayId === trayId) {
        set((state) => ({
          comments: [...state.comments, newComment],
        }));
      }

      return String(id);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Update an existing comment
  updateComment: async (id: string, content: string) => {
    const updatedData = { content, updatedAt: new Date() };

    try {
      await growDb.trayComments.update(toKey(id), updatedData);

      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === id ? { ...c, ...updatedData } : c
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete a comment
  deleteComment: async (id: string) => {
    try {
      await growDb.trayComments.delete(toKey(id));

      set((state) => ({
        comments: state.comments.filter((c) => c.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Clear comments (when closing edit form)
  clearComments: () => {
    set({ comments: [], currentTrayId: null, error: null });
  },
}));
