/**
 * useMediums Store Unit Tests
 *
 * Tests the growing medium configuration store including:
 * - Medium data structure and creation
 * - Medium lookup by value
 * - Cost rating validation
 */

import { describe, it, expect } from 'vitest';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

interface GrowMediumConfig {
  id?: string;
  value: string;              // Internal identifier (e.g., 'coco_coir')
  label: string;              // Display name (e.g., 'Coco Coir')
  costRating: 'low' | 'medium' | 'high';
  bestFor: string;            // Brief description of ideal use
  notes?: string;             // Additional tips
}

// ============================================
// TEST DATA HELPERS
// ============================================

let mediumCounter = 0;
function createMockMedium(overrides: Partial<GrowMediumConfig> = {}): GrowMediumConfig {
  mediumCounter++;
  return {
    id: `medium-${mediumCounter}`,
    value: 'coco_coir',
    label: 'Coco Coir',
    costRating: 'medium',
    bestFor: 'General purpose, good drainage',
    notes: 'Pre-wash to remove salt',
    ...overrides,
  };
}

// ============================================
// HELPER FUNCTIONS (mirrored from store logic)
// ============================================

function getMedium(mediums: GrowMediumConfig[], value: string): GrowMediumConfig | undefined {
  return mediums.find((m) => m.value === value);
}

function getMediumLabels(mediums: GrowMediumConfig[]): string[] {
  return mediums.map((m) => m.label);
}

function getMediumsByRating(mediums: GrowMediumConfig[], rating: 'low' | 'medium' | 'high'): GrowMediumConfig[] {
  return mediums.filter((m) => m.costRating === rating);
}

// ============================================
// MEDIUM DATA STRUCTURE TESTS
// ============================================

describe('Medium Data Structure', () => {
  describe('createMockMedium', () => {
    it('creates a medium with all required fields', () => {
      const medium = createMockMedium();

      expect(medium.value).toBeDefined();
      expect(medium.label).toBeDefined();
      expect(medium.costRating).toBeDefined();
      expect(medium.bestFor).toBeDefined();
    });

    it('applies custom overrides correctly', () => {
      const medium = createMockMedium({
        value: 'peat_moss',
        label: 'Peat Moss',
        costRating: 'low',
        bestFor: 'Moisture retention',
        notes: 'pH adjustment may be needed',
      });

      expect(medium.value).toBe('peat_moss');
      expect(medium.label).toBe('Peat Moss');
      expect(medium.costRating).toBe('low');
      expect(medium.bestFor).toBe('Moisture retention');
      expect(medium.notes).toBe('pH adjustment may be needed');
    });

    it('generates unique IDs for each medium', () => {
      const medium1 = createMockMedium();
      const medium2 = createMockMedium();

      expect(medium1.id).not.toBe(medium2.id);
    });

    it('allows optional notes field', () => {
      const mediumWithNotes = createMockMedium({ notes: 'Test notes' });
      const mediumWithoutNotes = createMockMedium({ notes: undefined });

      expect(mediumWithNotes.notes).toBe('Test notes');
      expect(mediumWithoutNotes.notes).toBeUndefined();
    });
  });
});

// ============================================
// MEDIUM LOOKUP TESTS
// ============================================

describe('Medium Lookup', () => {
  describe('getMedium', () => {
    it('returns undefined for empty medium list', () => {
      expect(getMedium([], 'coco_coir')).toBeUndefined();
    });

    it('returns the matching medium when found', () => {
      const mediums = [
        createMockMedium({ id: 'm1', value: 'coco_coir', label: 'Coco Coir' }),
        createMockMedium({ id: 'm2', value: 'peat_moss', label: 'Peat Moss' }),
        createMockMedium({ id: 'm3', value: 'hemp_mat', label: 'Hemp Mat' }),
      ];

      const found = getMedium(mediums, 'peat_moss');

      expect(found?.id).toBe('m2');
      expect(found?.label).toBe('Peat Moss');
    });

    it('returns undefined when medium not found', () => {
      const mediums = [
        createMockMedium({ value: 'coco_coir' }),
        createMockMedium({ value: 'peat_moss' }),
      ];

      expect(getMedium(mediums, 'hemp_mat')).toBeUndefined();
    });

    it('matches by value not label', () => {
      const mediums = [createMockMedium({ value: 'coco_coir', label: 'Coco Coir' })];

      // Should not match by label
      expect(getMedium(mediums, 'Coco Coir')).toBeUndefined();
      // Should match by value
      expect(getMedium(mediums, 'coco_coir')).toBeDefined();
    });

    it('is case sensitive for value lookup', () => {
      const mediums = [createMockMedium({ value: 'coco_coir' })];

      expect(getMedium(mediums, 'COCO_COIR')).toBeUndefined();
      expect(getMedium(mediums, 'Coco_Coir')).toBeUndefined();
      expect(getMedium(mediums, 'coco_coir')).toBeDefined();
    });
  });

  describe('getMediumLabels', () => {
    it('returns empty array for empty medium list', () => {
      expect(getMediumLabels([])).toEqual([]);
    });

    it('returns all medium labels', () => {
      const mediums = [
        createMockMedium({ label: 'Coco Coir' }),
        createMockMedium({ label: 'Peat Moss' }),
        createMockMedium({ label: 'Hemp Mat' }),
      ];

      const labels = getMediumLabels(mediums);

      expect(labels).toHaveLength(3);
      expect(labels).toContain('Coco Coir');
      expect(labels).toContain('Peat Moss');
      expect(labels).toContain('Hemp Mat');
    });
  });
});

// ============================================
// COST RATING TESTS
// ============================================

describe('Cost Rating Logic', () => {
  describe('getMediumsByRating', () => {
    const mediums = [
      createMockMedium({ value: 'paper_towel', label: 'Paper Towel', costRating: 'low' }),
      createMockMedium({ value: 'peat_moss', label: 'Peat Moss', costRating: 'low' }),
      createMockMedium({ value: 'coco_coir', label: 'Coco Coir', costRating: 'medium' }),
      createMockMedium({ value: 'hemp_mat', label: 'Hemp Mat', costRating: 'high' }),
      createMockMedium({ value: 'bio_strate', label: 'BioStrate', costRating: 'high' }),
    ];

    it('filters low cost mediums', () => {
      const lowCost = getMediumsByRating(mediums, 'low');

      expect(lowCost).toHaveLength(2);
      expect(lowCost.map((m) => m.value)).toContain('paper_towel');
      expect(lowCost.map((m) => m.value)).toContain('peat_moss');
    });

    it('filters medium cost mediums', () => {
      const mediumCost = getMediumsByRating(mediums, 'medium');

      expect(mediumCost).toHaveLength(1);
      expect(mediumCost[0].value).toBe('coco_coir');
    });

    it('filters high cost mediums', () => {
      const highCost = getMediumsByRating(mediums, 'high');

      expect(highCost).toHaveLength(2);
      expect(highCost.map((m) => m.value)).toContain('hemp_mat');
      expect(highCost.map((m) => m.value)).toContain('bio_strate');
    });

    it('returns empty array when no matches', () => {
      const onlyLow = [createMockMedium({ costRating: 'low' })];

      expect(getMediumsByRating(onlyLow, 'high')).toHaveLength(0);
    });
  });

  it('validates cost rating is one of valid values', () => {
    const validRatings: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    
    validRatings.forEach((rating) => {
      const medium = createMockMedium({ costRating: rating });
      expect(validRatings).toContain(medium.costRating);
    });
  });
});

// ============================================
// COMMON MEDIUM FIXTURES
// ============================================

describe('Common Medium Fixtures', () => {
  const commonMediums: GrowMediumConfig[] = [
    createMockMedium({
      value: 'coco_coir',
      label: 'Coco Coir',
      costRating: 'medium',
      bestFor: 'General purpose, good drainage',
      notes: 'Pre-wash to remove salt',
    }),
    createMockMedium({
      value: 'hemp_mat',
      label: 'Hemp Mat',
      costRating: 'high',
      bestFor: 'Sunflowers and larger seeds',
      notes: 'Easy cleanup, no mess',
    }),
    createMockMedium({
      value: 'peat_moss',
      label: 'Peat Moss',
      costRating: 'low',
      bestFor: 'Moisture-loving varieties',
      notes: 'May need pH adjustment',
    }),
    createMockMedium({
      value: 'soil_mix',
      label: 'Potting Soil',
      costRating: 'medium',
      bestFor: 'Wheatgrass, long grows',
    }),
  ];

  it('has expected number of common mediums', () => {
    expect(commonMediums.length).toBe(4);
  });

  it('coco coir is medium cost', () => {
    const cocoCoir = getMedium(commonMediums, 'coco_coir');
    expect(cocoCoir?.costRating).toBe('medium');
  });

  it('hemp mat is high cost', () => {
    const hempMat = getMedium(commonMediums, 'hemp_mat');
    expect(hempMat?.costRating).toBe('high');
  });

  it('peat moss is low cost', () => {
    const peatMoss = getMedium(commonMediums, 'peat_moss');
    expect(peatMoss?.costRating).toBe('low');
  });

  it('all mediums have bestFor description', () => {
    commonMediums.forEach((medium) => {
      expect(medium.bestFor).toBeDefined();
      expect(medium.bestFor.length).toBeGreaterThan(0);
    });
  });

  it('value and label are different case conventions', () => {
    commonMediums.forEach((medium) => {
      // value should be snake_case
      expect(medium.value).toMatch(/^[a-z_]+$/);
      // label should have spaces or capital letters
      expect(medium.label).not.toEqual(medium.value);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Medium Edge Cases', () => {
  it('handles medium with empty notes', () => {
    const medium = createMockMedium({ notes: '' });
    expect(medium.notes).toBe('');
  });

  it('handles medium with very long bestFor description', () => {
    const longDesc = 'A'.repeat(500);
    const medium = createMockMedium({ bestFor: longDesc });
    expect(medium.bestFor.length).toBe(500);
  });

  it('handles medium with special characters in label', () => {
    const medium = createMockMedium({ label: 'Bio-Strate (Premium)' });
    expect(medium.label).toBe('Bio-Strate (Premium)');
  });

  it('handles underscore-heavy value strings', () => {
    const medium = createMockMedium({ value: 'premium_organic_coco_coir' });
    expect(medium.value).toBe('premium_organic_coco_coir');
  });

  it('handles value lookup with exact match only', () => {
    const mediums = [createMockMedium({ value: 'coco' })];
    
    // Partial matches should not work
    expect(getMedium(mediums, 'coco_coir')).toBeUndefined();
    expect(getMedium(mediums, 'co')).toBeUndefined();
    // Exact match works
    expect(getMedium(mediums, 'coco')).toBeDefined();
  });
});

// ============================================
// FORM SELECT HELPER TESTS
// ============================================

describe('Form Select Helpers', () => {
  const mediums = [
    createMockMedium({ value: 'coco_coir', label: 'Coco Coir' }),
    createMockMedium({ value: 'hemp_mat', label: 'Hemp Mat' }),
    createMockMedium({ value: 'peat_moss', label: 'Peat Moss' }),
  ];

  it('can create select options from mediums', () => {
    const options = mediums.map((m) => ({
      value: m.value,
      label: m.label,
    }));

    expect(options).toHaveLength(3);
    expect(options[0]).toEqual({ value: 'coco_coir', label: 'Coco Coir' });
  });

  it('can display medium info for selection', () => {
    const displayItems = mediums.map((m) => ({
      id: m.id,
      display: `${m.label} (${m.costRating} cost)`,
      description: m.bestFor,
    }));

    expect(displayItems[0].display).toBe('Coco Coir (medium cost)');
    expect(displayItems[0].description).toBeDefined();
  });
});
