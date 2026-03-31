import { describe, it, expect } from 'vitest';
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_COLORS,
  getCategoryDisplay,
  formatCurrency,
} from '../utils';

describe('supply utils', () => {
  describe('CATEGORY_DISPLAY_NAMES', () => {
    it('has display name for every category', () => {
      const categories = ['rooting_hormone', 'growing_medium', 'containers', 'labels', 'tools', 'heating', 'misting', 'other'] as const;
      for (const cat of categories) {
        expect(CATEGORY_DISPLAY_NAMES[cat]).toBeTruthy();
      }
    });

    it('display names are human-readable', () => {
      expect(CATEGORY_DISPLAY_NAMES.rooting_hormone).toBe('Rooting Hormone');
      expect(CATEGORY_DISPLAY_NAMES.growing_medium).toBe('Growing Medium');
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('has colors for every category', () => {
      const categories = ['rooting_hormone', 'growing_medium', 'containers', 'labels', 'tools', 'heating', 'misting', 'other'] as const;
      for (const cat of categories) {
        expect(CATEGORY_COLORS[cat].bg).toBeTruthy();
        expect(CATEGORY_COLORS[cat].text).toBeTruthy();
      }
    });
  });

  describe('getCategoryDisplay', () => {
    it('returns display name for known category', () => {
      expect(getCategoryDisplay('rooting_hormone')).toBe('Rooting Hormone');
    });

    it('returns category string for unknown category', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getCategoryDisplay('unknown' as any)).toBe('unknown');
    });
  });

  describe('formatCurrency', () => {
    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('formats whole numbers with two decimals', () => {
      expect(formatCurrency(10)).toBe('$10.00');
    });

    it('formats decimals correctly', () => {
      expect(formatCurrency(9.99)).toBe('$9.99');
    });
  });
});
