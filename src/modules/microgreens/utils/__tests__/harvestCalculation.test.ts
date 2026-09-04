import { describe, it, expect } from 'vitest';
import {
  calculateHarvestDate,
  getDaysUntilHarvest,
  getHarvestStatus,
  getHarvestLabel,
  getHarvestForecast,
  getHarvestBadgeClasses,
} from '../harvestCalculation';
import { addDays, startOfDay } from 'date-fns';

describe('harvestCalculation', () => {
  const today = startOfDay(new Date());

  describe('calculateHarvestDate', () => {
    it('returns null for undefined days', () => {
      expect(calculateHarvestDate(today, undefined)).toBeNull();
    });

    it('returns null for zero days', () => {
      expect(calculateHarvestDate(today, 0)).toBeNull();
    });

    it('returns correct date for positive days', () => {
      const result = calculateHarvestDate(today, 10);
      expect(result).toEqual(addDays(today, 10));
    });

    it('returns null for negative days', () => {
      expect(calculateHarvestDate(today, -1)).toBeNull();
    });
  });

  describe('getDaysUntilHarvest', () => {
    it('returns null for null harvest date', () => {
      expect(getDaysUntilHarvest(null)).toBeNull();
    });

    it('returns 0 for today', () => {
      expect(getDaysUntilHarvest(today, today)).toBe(0);
    });

    it('returns positive for future date', () => {
      expect(getDaysUntilHarvest(addDays(today, 5), today)).toBe(5);
    });

    it('returns negative for past date', () => {
      expect(getDaysUntilHarvest(addDays(today, -3), today)).toBe(-3);
    });
  });

  describe('getHarvestStatus', () => {
    it('returns unknown for null', () => {
      expect(getHarvestStatus(null)).toBe('unknown');
    });

    it('returns overdue for negative', () => {
      expect(getHarvestStatus(-1)).toBe('overdue');
    });

    it('returns ready for zero', () => {
      expect(getHarvestStatus(0)).toBe('ready');
    });

    it('returns soon for 1-2 days', () => {
      expect(getHarvestStatus(1)).toBe('soon');
      expect(getHarvestStatus(2)).toBe('soon');
    });

    it('returns growing for 3+ days', () => {
      expect(getHarvestStatus(3)).toBe('growing');
    });
  });

  describe('getHarvestLabel', () => {
    it('returns Unknown for null', () => {
      expect(getHarvestLabel(null, 'unknown')).toBe('Unknown');
    });

    it('returns Ready for ready status', () => {
      expect(getHarvestLabel(0, 'ready')).toBe('Ready');
    });

    it('returns overdue text for negative days', () => {
      expect(getHarvestLabel(-1, 'overdue')).toBe('1 day overdue');
      expect(getHarvestLabel(-3, 'overdue')).toBe('3 days overdue');
    });

    it('returns day count for growing', () => {
      expect(getHarvestLabel(5, 'growing')).toBe('5 days');
    });
  });

  describe('getHarvestForecast', () => {
    it('returns unknown status when variety is undefined', () => {
      const forecast = getHarvestForecast({ dateSown: today }, undefined, today);
      expect(forecast.status).toBe('unknown');
      expect(forecast.expectedDate).toBeNull();
    });

    it('returns correct forecast for valid data', () => {
      const forecast = getHarvestForecast(
        { dateSown: addDays(today, -8) },
        { typicalDaysToHarvest: 10 },
        today
      );
      expect(forecast.daysRemaining).toBe(2);
      expect(forecast.status).toBe('soon');
    });
  });

  describe('getHarvestBadgeClasses', () => {
    it('returns green classes for ready', () => {
      expect(getHarvestBadgeClasses('ready')).toContain('green');
    });

    it('returns yellow classes for soon', () => {
      expect(getHarvestBadgeClasses('soon')).toContain('yellow');
    });

    it('returns slate classes for growing', () => {
      expect(getHarvestBadgeClasses('growing')).toContain('slate');
    });
  });
});
