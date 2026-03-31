import { describe, it, expect } from 'vitest';
import { defaultMediums } from '../seed-mediums';

describe('seed-mediums', () => {
  it('exports a non-empty array of mediums', () => {
    expect(Array.isArray(defaultMediums)).toBe(true);
    expect(defaultMediums.length).toBeGreaterThan(5);
  });

  it('each medium has required fields', () => {
    for (const m of defaultMediums) {
      expect(m.value).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(m.costRating);
      expect(m.bestFor).toBeTruthy();
      expect(m.notes).toBeTruthy();
    }
  });

  it('no duplicate medium values', () => {
    const values = defaultMediums.map((m) => m.value);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('no duplicate medium labels', () => {
    const labels = defaultMediums.map((m) => m.label);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it('includes common mediums', () => {
    const values = defaultMediums.map((m) => m.value);
    expect(values).toContain('coco_coir');
    expect(values).toContain('hemp_mat');
    expect(values).toContain('soil');
  });
});
