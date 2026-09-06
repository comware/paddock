import { describe, it, expect } from 'vitest';
import { __findMatchingGuideForTesting as findMatchingGuide } from '../useVegetableGuide';
import type { VegetableGuideMetadata, VegetableGuideIndex } from '../vegetable-types';
import indexData from '../../../../public/guides/vegetables/index.json';

// The matcher is pure and synchronous, so it is tested directly rather than
// through the hook. Going through the hook would mean mounting it with
// @testing-library/react, mocking global.fetch for both the index and the
// content file, and waiting on isLoading — all to exercise logic that has no
// dependency on React state or network at all. Testing the exported function
// is simpler, faster, and just as meaningful: the hook itself is a thin
// fetch + cache wrapper around this matcher.

const guides: VegetableGuideMetadata[] = [
  {
    id: 'carrot',
    name: 'Carrot',
    category: 'roots',
    difficulty: 'moderate',
    daysToMaturity: '70-100',
    sowingMethod: 'direct',
    spacingCm: 5,
    rowSpacingCm: 25,
    sowingDepthMm: 5,
    soilTempC: '8-30',
    successionDays: 21,
    file: 'roots/carrot.md',
    status: 'stub',
  },
  {
    id: 'chard',
    name: 'Chard',
    category: 'leafy-greens',
    difficulty: 'moderate',
    daysToMaturity: '50-60',
    sowingMethod: 'either',
    spacingCm: 25,
    rowSpacingCm: 40,
    sowingDepthMm: 15,
    soilTempC: '10-30',
    successionDays: 21,
    file: 'leafy-greens/chard.md',
    status: 'stub',
  },
];

describe('findMatchingGuide (vegetable matcher)', () => {
  it('finds an exact name match', () => {
    const match = findMatchingGuide('Carrot', guides);
    expect(match?.id).toBe('carrot');
  });

  it('finds a case-insensitive match', () => {
    const match = findMatchingGuide('carrot', guides);
    expect(match?.id).toBe('carrot');
  });

  it('finds an alias match, including lowercase input', () => {
    const upper = findMatchingGuide('Silverbeet', guides);
    expect(upper?.id).toBe('chard');

    const lower = findMatchingGuide('silverbeet', guides);
    expect(lower?.id).toBe('chard');
  });

  it('returns null for an unknown crop rather than throwing', () => {
    expect(() => findMatchingGuide('Durian', guides)).not.toThrow();
    expect(findMatchingGuide('Durian', guides)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(findMatchingGuide('', guides)).toBeNull();
  });
});

describe('vegetables index.json', () => {
  const data = indexData as VegetableGuideIndex;

  it('has a unique file per guide entry', () => {
    const files = data.guides.map(g => g.file);
    expect(new Set(files).size).toBe(files.length);
  });

  it('references only categories that exist', () => {
    const categoryIds = new Set(data.categories.map(c => c.id));
    for (const guide of data.guides) {
      expect(categoryIds.has(guide.category)).toBe(true);
    }
  });

  it('has a successionDays that is either a positive number or null', () => {
    for (const guide of data.guides) {
      const value = guide.successionDays;
      const isValid = value === null || (typeof value === 'number' && value > 0);
      expect(isValid).toBe(true);
    }
  });
});
