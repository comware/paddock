import { describe, it, expect } from 'vitest';
import {
  SUPPLY_CATEGORIES,
  UNIT_OPTIONS,
  supplySchema,
  purchaseSchema,
  formatCurrency,
} from '../SupplyFormConstants';

describe('SupplyFormConstants', () => {
  describe('SUPPLY_CATEGORIES', () => {
    it('has 8 categories', () => {
      expect(SUPPLY_CATEGORIES).toHaveLength(8);
    });

    it('each category has value, label, and description', () => {
      for (const cat of SUPPLY_CATEGORIES) {
        expect(cat.value).toBeTruthy();
        expect(cat.label).toBeTruthy();
        expect(cat.description).toBeTruthy();
      }
    });
  });

  describe('UNIT_OPTIONS', () => {
    it('has at least 5 unit options', () => {
      expect(UNIT_OPTIONS.length).toBeGreaterThanOrEqual(5);
    });

    it('includes common units', () => {
      const values = UNIT_OPTIONS.map((o) => o.value);
      expect(values).toContain('ml');
      expect(values).toContain('pcs');
      expect(values).toContain('kg');
    });
  });

  describe('supplySchema', () => {
    it('accepts valid supply data', () => {
      const result = supplySchema.safeParse({
        name: 'Rooting gel',
        category: 'rooting_hormone',
        unit: 'ml',
        quantityPurchased: 100,
        totalCost: 25,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = supplySchema.safeParse({
        name: '',
        category: 'tools',
        unit: 'pcs',
        quantityPurchased: 1,
        totalCost: 10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero quantity', () => {
      const result = supplySchema.safeParse({
        name: 'Test',
        category: 'tools',
        unit: 'pcs',
        quantityPurchased: 0,
        totalCost: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('purchaseSchema', () => {
    it('accepts valid purchase data', () => {
      const result = purchaseSchema.safeParse({ quantity: 5, totalCost: 20 });
      expect(result.success).toBe(true);
    });

    it('rejects negative cost', () => {
      const result = purchaseSchema.safeParse({ quantity: 5, totalCost: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('formats values with dollar sign', () => {
      expect(formatCurrency(10)).toContain('$');
    });

    it('handles small fractions', () => {
      const result = formatCurrency(0.0025);
      expect(result).toContain('0.00');
    });
  });
});
