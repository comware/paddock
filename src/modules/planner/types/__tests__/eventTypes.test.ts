import { describe, it, expect } from 'vitest';
import { PlannerEventTypeValues } from '../eventTypes';

describe('planner eventTypes', () => {
  describe('PlannerEventTypeValues', () => {
    it('has grow module event types', () => {
      expect(PlannerEventTypeValues.SOW).toBe('sow');
      expect(PlannerEventTypeValues.BLACKOUT_END).toBe('blackout_end');
      expect(PlannerEventTypeValues.HARVEST).toBe('harvest');
      expect(PlannerEventTypeValues.WATER).toBe('water');
      expect(PlannerEventTypeValues.INSPECTION).toBe('inspection');
    });

    it('has propagation module event types', () => {
      expect(PlannerEventTypeValues.TAKE_CUTTINGS).toBe('take_cuttings');
      expect(PlannerEventTypeValues.ROOTING_CHECK).toBe('rooting_check');
      expect(PlannerEventTypeValues.POT_UP).toBe('pot_up');
      expect(PlannerEventTypeValues.HARDEN_OFF).toBe('harden_off');
      expect(PlannerEventTypeValues.GRADUATION).toBe('graduation');
    });

    it('has general event types', () => {
      expect(PlannerEventTypeValues.MAINTENANCE).toBe('maintenance');
      expect(PlannerEventTypeValues.PURCHASE).toBe('purchase');
      expect(PlannerEventTypeValues.OTHER).toBe('other');
    });

    it('has at least 13 event types', () => {
      expect(Object.keys(PlannerEventTypeValues).length).toBeGreaterThanOrEqual(13);
    });

    it('all values are lowercase strings', () => {
      for (const value of Object.values(PlannerEventTypeValues)) {
        expect(value).toBe(value.toLowerCase());
        expect(typeof value).toBe('string');
      }
    });
  });
});
