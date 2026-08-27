/**
 * Demo Growing History
 *
 * A plausible six months of microgreens growing, for demonstrating what an AI agent can
 * do with a grower's real performance record.
 *
 * NOT seeded by default. Runs only when VITE_DEMO_SEED=true and the tray table is empty,
 * so a real grower never finds invented trays in their own database.
 *
 * Two things this data is deliberately not:
 *
 *   Not clean. Germination rates vary, two trays failed outright, quality grades are
 *   mixed, and problems are recorded in the grower's own shorthand. Tidy synthetic data
 *   would make the agent's derived numbers look invented.
 *
 *   Not random. Every value is fixed, so a demo recorded today and re-recorded tomorrow
 *   produces identical figures. Reproducibility matters more than variety here.
 *
 * The shape of the story: basil consistently runs slower on this bench than its
 * configured 16 days - about 20 - because the greenhouse is cold overnight through
 * winter. Radish runs almost exactly to book. That divergence is the entire point: it is
 * knowledge that exists only in this browser.
 */

import { db } from './schema';
import type { GrowSite, GrowTray } from './schema';

const DAY = 86_400_000;

/** Days before now, as a Date. Keeps the fixtures readable as "N days ago". */
const daysAgo = (n: number, from: number): Date => new Date(from - n * DAY);

interface TraySpec {
  variety: string;
  /** Sown this many days ago. */
  sown: number;
  /** Sow-to-harvest span. Omit for trays still growing. */
  span?: number;
  seedWeight: number;
  medium: string;
  blackout: number;
  preSoaked?: boolean;
  germination?: number;
  weight?: number;
  grade?: 'A' | 'B' | 'C' | 'F';
  sellable?: boolean;
  problems?: string;
  lessons?: string;
}

/**
 * Basil: the story variety. Configured at 16 days, actually runs ~20 here.
 * Winter trays (sown 150-100 days ago) run slowest.
 */
const BASIL: TraySpec[] = [
  {
    variety: 'Basil', sown: 168, span: 19, seedWeight: 28, medium: 'coco_coir',
    blackout: 5, germination: 88, weight: 210, grade: 'A', sellable: true,
    problems: '', lessons: 'First basil run. Slower than the packet says.',
  },
  {
    variety: 'Basil', sown: 140, span: 22, seedWeight: 30, medium: 'coco_coir',
    blackout: 5, germination: 74, weight: 165, grade: 'B', sellable: true,
    problems: 'Cold snap - overnight lows under 10C, germination dragged',
    lessons: 'Basil hates the cold greenhouse. Needs the heat mat below 12C.',
  },
  {
    variety: 'Basil', sown: 121, span: 23, seedWeight: 30, medium: 'coco_coir',
    blackout: 5, germination: 69, weight: 148, grade: 'B', sellable: true,
    problems: 'Uneven germination across the tray, thin at the north end',
    lessons: 'North end of the bench is colder. Rotate trays midweek.',
  },
  {
    variety: 'Basil', sown: 98, seedWeight: 30, medium: 'coco_coir', blackout: 5,
    germination: 41, grade: 'F', sellable: false, span: 12,
    problems: 'Damping off - sowed too dense and kept the dome on too long',
    lessons: 'Pull the dome at day 3, not day 5. Lost the whole tray.',
  },
  {
    variety: 'Basil', sown: 76, span: 20, seedWeight: 26, medium: 'coco_coir',
    blackout: 5, germination: 91, weight: 224, grade: 'A', sellable: true,
    problems: '', lessons: 'Lighter sowing density worked. 26g is the number.',
  },
  {
    variety: 'Basil', sown: 52, span: 19, seedWeight: 26, medium: 'coco_coir',
    blackout: 5, germination: 93, weight: 231, grade: 'A', sellable: true,
    problems: '', lessons: '',
  },
  {
    variety: 'Basil', sown: 28, span: 21, seedWeight: 26, medium: 'coco_coir',
    blackout: 5, germination: 87, weight: 205, grade: 'A', sellable: true,
    problems: 'Slight yellowing on day 14, went to light a day late',
    lessons: '',
  },
];

/** Radish: the reliable contrast. Configured at 8 days, runs at 8. */
const RADISH: TraySpec[] = [
  {
    variety: 'Radish (China Rose)', sown: 155, span: 8, seedWeight: 40,
    medium: 'hemp_mat', blackout: 3, germination: 96, weight: 340, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
  {
    variety: 'Radish (China Rose)', sown: 130, span: 8, seedWeight: 40,
    medium: 'hemp_mat', blackout: 3, germination: 94, weight: 328, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
  {
    variety: 'Radish (China Rose)', sown: 104, span: 9, seedWeight: 40,
    medium: 'hemp_mat', blackout: 3, germination: 92, weight: 315, grade: 'A',
    sellable: true, problems: 'Bit leggy - light came on late', lessons: '',
  },
  {
    variety: 'Radish (China Rose)', sown: 70, span: 8, seedWeight: 42,
    medium: 'hemp_mat', blackout: 3, germination: 97, weight: 355, grade: 'A',
    sellable: true, problems: '', lessons: '42g gives a fuller tray.',
  },
  {
    variety: 'Radish (China Rose)', sown: 41, span: 8, seedWeight: 42,
    medium: 'hemp_mat', blackout: 3, germination: 95, weight: 344, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
];

/** Sunflower: mostly good, one hull-rot write-off. */
const SUNFLOWER: TraySpec[] = [
  {
    variety: 'Sunflower', sown: 147, span: 11, seedWeight: 120, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 89, weight: 480, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
  {
    variety: 'Sunflower', sown: 112, span: 12, seedWeight: 120, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 84, weight: 445, grade: 'B',
    sellable: true, problems: 'Hulls stuck on maybe a fifth of the tray',
    lessons: 'Weight the tray properly during blackout.',
  },
  {
    variety: 'Sunflower', sown: 88, span: 10, seedWeight: 120, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 52, grade: 'F', sellable: false,
    problems: 'Mould through the middle. Soaked too long in warm weather.',
    lessons: 'Cut the soak to 8 hours over summer.',
  },
  {
    variety: 'Sunflower', sown: 60, span: 11, seedWeight: 115, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 91, weight: 495, grade: 'A',
    sellable: true, problems: '', lessons: '8 hour soak fixed it.',
  },
  {
    variety: 'Sunflower', sown: 33, span: 12, seedWeight: 115, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 90, weight: 470, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
];

/** Pea shoots: small sample, slightly slow. */
const PEA: TraySpec[] = [
  {
    variety: 'Pea Shoots', sown: 136, span: 13, seedWeight: 150, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 93, weight: 520, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
  {
    variety: 'Pea Shoots', sown: 95, span: 14, seedWeight: 150, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 88, weight: 495, grade: 'B',
    sellable: true, problems: 'Some yellowing at the base', lessons: '',
  },
  {
    variety: 'Pea Shoots', sown: 47, span: 13, seedWeight: 150, medium: 'soil',
    blackout: 4, preSoaked: true, germination: 94, weight: 535, grade: 'A',
    sellable: true, problems: '', lessons: '',
  },
];

/** Currently growing - gives the agent live capacity to reason about. */
const IN_FLIGHT: TraySpec[] = [
  {
    variety: 'Basil', sown: 11, seedWeight: 26, medium: 'coco_coir', blackout: 5,
    germination: 90, problems: '', lessons: '',
  },
  {
    variety: 'Radish (China Rose)', sown: 4, seedWeight: 42, medium: 'hemp_mat',
    blackout: 3, problems: '', lessons: '',
  },
  {
    variety: 'Sunflower', sown: 6, seedWeight: 115, medium: 'soil', blackout: 4,
    preSoaked: true, germination: 88, problems: '', lessons: '',
  },
];

const ALL_SPECS: TraySpec[] = [
  ...BASIL, ...RADISH, ...SUNFLOWER, ...PEA, ...IN_FLIGHT,
];

function toTray(spec: TraySpec, trayNumber: number, siteId: string, now: number): GrowTray {
  const dateSown = daysAgo(spec.sown, now);
  const createdAt = dateSown;

  return {
    siteId,
    trayNumber,
    variety: spec.variety,
    dateSown,
    seedWeight: spec.seedWeight,
    growingMedium: spec.medium,
    preSoaked: spec.preSoaked ?? false,
    blackoutDays: spec.blackout,
    dateToLight: new Date(dateSown.getTime() + spec.blackout * DAY),
    germinationRate: spec.germination,
    dateHarvested:
      spec.span === undefined
        ? undefined
        : new Date(dateSown.getTime() + spec.span * DAY),
    harvestWeight: spec.weight,
    qualityGrade: spec.grade,
    sellable: spec.sellable,
    problemsObserved: spec.problems ?? '',
    lessonsLearned: spec.lessons ?? '',
    createdAt,
    updatedAt: createdAt,
  } as GrowTray;
}

/**
 * Build the demo trays without touching the database.
 *
 * Split out from seeding so the figures the demo depends on can be verified in tests
 * without an IndexedDB implementation. Ordered oldest-first so tray numbers read
 * chronologically, the way they would have accumulated in real use.
 */
export function buildDemoTrays(siteId: string, now: number = Date.now()): GrowTray[] {
  const ordered = [...ALL_SPECS].sort((a, b) => b.sown - a.sown);
  return ordered.map((spec, i) => toTray(spec, i + 1, siteId, now));
}

/**
 * Seed demo history. No-op unless the tray table is empty.
 *
 * Returns how many trays were written, so callers can log or verify.
 */
export async function seedDemoHistory(): Promise<number> {
  const existing = await db.growTrays.count();
  if (existing > 0) return 0;

  const now = Date.now();

  // A site to hang everything off. Sorted oldest-first so tray numbers read
  // chronologically, the way they would have accumulated in real use.
  let siteId: string;
  const sites = await db.growSites.toArray();

  if (sites.length > 0) {
    siteId = String((sites.find((s) => s.isDefault) ?? sites[0]).id);
  } else {
    const site: Omit<GrowSite, 'id'> = {
      name: 'Home Greenhouse',
      description: 'Backyard greenhouse, unheated, shade cloth over summer',
      latitude: -37.06,
      longitude: 144.22,
      timezone: 'Australia/Melbourne',
      isDefault: true,
      isIndoor: false,
      weatherEnabled: false,
      createdAt: new Date(now - 200 * DAY),
      updatedAt: new Date(now - 200 * DAY),
    };
    siteId = String(await db.growSites.add(site as GrowSite));
  }

  const trays = buildDemoTrays(siteId, now);
  await db.growTrays.bulkAdd(trays);
  return trays.length;
}

/** Remove demo trays. Development convenience - not wired to any UI. */
export async function clearDemoHistory(): Promise<void> {
  await db.growTrays.clear();
}
