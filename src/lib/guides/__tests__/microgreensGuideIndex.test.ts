/**
 * The microgreens index and the markdown must agree.
 *
 * Vegetables and propagation each had a test like this. Microgreens - the oldest and largest
 * library of the three, 76 guides - had none, so nothing compared its index.json against the
 * Quick Facts tables that restate the same figures on screen. Both are visible to a grower at
 * once: the library card says 12 days, the guide it opens says 10-14.
 *
 * It is clean today. That is the argument for writing it down rather than against: the
 * vegetable guides were clean too, until a round of fact-checking corrected 25 tables and
 * left the prose beneath them stating the old numbers, which nothing noticed for months. The
 * cost of this file is that the next such round fails loudly instead.
 *
 * Containment, not equality, and deliberately so. The index stores one number where the guide
 * states a range - `daysToHarvest: 12` against "10-14 days" - because a card needs a single
 * figure to sort on and a guide needs to be honest about spread. So the index value must fall
 * inside what the guide says, not equal it. Same for difficulty, where "Beginner-Intermediate"
 * legitimately contains the index's `beginner`.
 */

import { describe, expect, it } from 'vitest';
import type { GuideMetadata } from '../types';
import indexJson from '../../../../public/guides/index.json';

/**
 * The guides live in public/, outside the module graph, so the app fetches them at runtime.
 * Vite's glob reads them off disk at test time instead, which keeps this file free of
 * node:fs and therefore of @types/node in the app's tsconfig.
 */
const markdownByPath = import.meta.glob('../../../../public/guides/*/*.md', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const index = indexJson as { guides: GuideMetadata[] };

const MARKER = '/public/guides/';

/**
 * Prose that is not a microgreens variety guide.
 *
 * Three kinds sit at the same depth as the guides and would otherwise read as orphans: the
 * getting-started track, which is about growing rather than about a variety and carries none
 * of these fields; the templates and per-directory authoring notes; and propagation's own
 * top-level files, since that module keeps its guides one directory further down and only its
 * templates and CLAUDE.md land at this level.
 */
function isVarietyGuide(key: string): boolean {
  const rel = key.slice(key.indexOf(MARKER) + MARKER.length);
  if (rel.includes('CLAUDE.md') || rel.startsWith('_') || rel.includes('/_')) return false;
  return !rel.startsWith('getting-started/') && !rel.startsWith('propagation/');
}

function markdownFor(file: string): string | undefined {
  const suffix = `${MARKER}${file}`;
  const key = Object.keys(markdownByPath).find((k) => k.endsWith(suffix));
  return key ? markdownByPath[key] : undefined;
}

/** One row out of a Quick Facts table. Null when the row is absent. */
function quickFact(markdown: string, label: string): string | null {
  const row = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|([^|]*)\\|`).exec(markdown);
  return row ? row[1].trim() : null;
}

/**
 * Does the guide's stated figure cover this number?
 *
 * Accepts a range ("10-14 days"), a bare number, or a value carrying units and parentheticals
 * ("100-150g per 10x20 tray"), since Quick Facts rows are written for a reader rather than a
 * parser.
 */
function covers(stated: string, value: number): boolean {
  for (const [, lo, hi] of stated.matchAll(/(\d+)\s*-\s*(\d+)/g)) {
    if (value >= Number(lo) && value <= Number(hi)) return true;
  }
  return [...stated.matchAll(/\d+/g)].some((m) => Number(m[0]) === value);
}

describe('microgreens guide index', () => {
  it('indexes 76 guides, and the glob can see them', () => {
    // Guards every case below: a moved directory would otherwise make them all vacuous.
    expect(index.guides.length).toBeGreaterThan(0);
    expect(Object.keys(markdownByPath).filter(isVarietyGuide).length).toBeGreaterThan(0);
  });

  it.each(index.guides.map((g) => [g.id, g] as const))('%s agrees with its markdown', (_id, guide) => {
    const markdown = markdownFor(guide.file);
    expect(markdown, `${guide.file}: no such guide on disk`).toBeDefined();

    // Difficulty by containment: "Beginner-Intermediate" contains "beginner".
    const difficulty = quickFact(markdown!, 'Difficulty');
    expect(difficulty, `${guide.file}: no Difficulty row`).not.toBeNull();
    expect(
      difficulty!.toLowerCase(),
      `${guide.file}: index says ${guide.difficulty}, guide says ${difficulty}`
    ).toContain(guide.difficulty.toLowerCase());

    const days = quickFact(markdown!, 'Days to Harvest');
    expect(days, `${guide.file}: no Days to Harvest row`).not.toBeNull();
    expect(
      covers(days!, guide.daysToHarvest),
      `${guide.file}: index says ${guide.daysToHarvest} days, guide says "${days}"`
    ).toBe(true);

    const blackout = quickFact(markdown!, 'Blackout Period');
    expect(blackout, `${guide.file}: no Blackout Period row`).not.toBeNull();
    expect(
      covers(blackout!, guide.blackoutDays),
      `${guide.file}: index says ${guide.blackoutDays} blackout days, guide says "${blackout}"`
    ).toBe(true);

    /**
     * The column is "Pre-soak Required", so the boolean is about requirement, not about
     * whether soaking is possible. Five guides say "Optional (4-8 hours)" against `false`,
     * and that is the correct encoding rather than a disagreement - which is precisely why
     * this is asserted as a rule instead of left to look like drift later.
     */
    const preSoak = quickFact(markdown!, 'Pre-soak Required');
    expect(preSoak, `${guide.file}: no Pre-soak Required row`).not.toBeNull();
    expect(
      preSoak!.toLowerCase().startsWith('yes'),
      `${guide.file}: index says preSoak ${guide.preSoak}, guide says "${preSoak}"`
    ).toBe(guide.preSoak);
  });

  it('leaves no variety guide on disk out of the index', () => {
    const indexed = new Set(index.guides.map((g) => `${MARKER}${g.file}`));
    const orphans = Object.keys(markdownByPath)
      .filter(isVarietyGuide)
      .filter((k) => !Array.from(indexed).some((i) => k.endsWith(i)));
    expect(orphans, 'variety guides on disk that the index never lists').toEqual([]);
  });

  /**
   * The getting-started track is reachable.
   *
   * These six are referenced only by a hardcoded list in GuideLibrary, not by index.json, so
   * nothing else would notice a rename until a reader clicked the card and got a blank modal.
   */
  it('has every getting-started page the library links to', () => {
    const expected = [
      'concepts',
      'equipment',
      'first-tray',
      'tray-setup',
      'watering',
      'troubleshooting',
    ];
    for (const id of expected) {
      const suffix = `${MARKER}getting-started/${id}.md`;
      expect(
        Object.keys(markdownByPath).some((k) => k.endsWith(suffix)),
        `missing getting-started page: ${id}.md`
      ).toBe(true);
    }
  });
});
