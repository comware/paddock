/**
 * The index and the markdown must agree.
 *
 * Every crop's facts are written down twice: as metadata in index.json, which drives the
 * library cards, the filters and the crop panel beside a planting, and again as a Quick
 * Facts table at the top of the guide itself. Both are on screen. A grower who filters for
 * "under 60 days" and then opens the guide to read "100-150" has been told two things.
 *
 * They drifted once already - a round of fact-checking against Australian sources moved 26
 * crops, and every one had to be corrected in two places by hand. This test is what makes
 * the second place non-optional.
 */

import { describe, expect, it } from 'vitest';
import type { VegetableGuideMetadata } from '../vegetable-types';
import indexJson from '../../../../public/guides/vegetables/index.json';

/**
 * The guides live in public/, so they are not part of the module graph at runtime - the app
 * fetches them. Vite's glob import reads them off disk at test time instead, which keeps this
 * test free of node:fs and therefore of @types/node in the app's tsconfig.
 */
const markdownByPath = import.meta.glob('../../../../public/guides/vegetables/*/*.md', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const index = indexJson as { guides: VegetableGuideMetadata[] };

/** index.json stores "brassicas/cabbage.md"; the glob keys are relative paths. */
function markdownFor(file: string): string | undefined {
  const suffix = `/public/guides/vegetables/${file}`;
  const key = Object.keys(markdownByPath).find((k) => k.endsWith(suffix));
  return key ? markdownByPath[key] : undefined;
}

/** Reads one row out of a Quick Facts table. Returns null when the row is absent. */
function quickFact(markdown: string, label: string): string | null {
  const row = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|([^|]*)\\|`).exec(markdown);
  return row ? row[1].trim() : null;
}

/** Collapses "10-20°C" and "10-20 °C" to the same thing, so spacing is not a failure. */
function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

describe('vegetable guide index', () => {
  it.each(index.guides.map((g) => [g.id, g] as const))('%s agrees with its markdown', (_id, guide) => {
    const markdown = markdownFor(guide.file);
    expect(markdown, `${guide.file}: no such guide on disk`).toBeDefined();

    const expected: Record<string, string> = {
      Difficulty: guide.difficulty,
      'Days to Maturity': guide.daysToMaturity,
      'Sowing Method': guide.sowingMethod,
      'Plant Spacing': `${guide.spacingCm} cm`,
      'Row Spacing': `${guide.rowSpacingCm} cm`,
      'Sowing Depth': `${guide.sowingDepthMm} mm`,
      'Soil Temperature': `${guide.soilTempC} °C`,
      'Suggested succession':
        guide.successionDays === null
          ? 'Not a succession crop'
          : `Every ${guide.successionDays} days`,
    };

    for (const [label, value] of Object.entries(expected)) {
      const actual = quickFact(markdown!, label);
      expect(actual, `${guide.file}: no "${label}" row in Quick Facts`).not.toBeNull();
      expect(normalise(actual!), `${guide.file}: ${label}`).toBe(normalise(value));
    }
  });

  it('leaves no guide on disk out of the index', () => {
    const indexed = new Set(index.guides.map((g) => `/public/guides/vegetables/${g.file}`));
    const orphans = Object.keys(markdownByPath).filter(
      (k) => !Array.from(indexed).some((i) => k.endsWith(i))
    );
    expect(orphans, 'guides on disk that the index never lists').toEqual([]);
  });
});
