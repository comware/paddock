import { describe, it, expect } from 'vitest';
import { TYPE_DISPLAY_NAMES, getOccupancyColor } from '../StationDetailParts';

describe('StationDetailParts', () => {
  describe('TYPE_DISPLAY_NAMES', () => {
    it('has display name for common station types', () => {
      expect(TYPE_DISPLAY_NAMES['heated_propagator']).toBe('Heated Propagator');
      expect(TYPE_DISPLAY_NAMES['cold_frame']).toBe('Cold Frame');
      expect(TYPE_DISPLAY_NAMES['greenhouse_bench']).toBe('Greenhouse Bench');
    });

    it('has display name for all types', () => {
      const types = ['heated_propagator', 'unheated_propagator', 'water_propagation', 'outdoor_bed', 'cold_frame', 'greenhouse_bench', 'mist_system', 'other'];
      for (const t of types) {
        expect(TYPE_DISPLAY_NAMES[t]).toBeTruthy();
      }
    });
  });

  describe('getOccupancyColor', () => {
    it('returns red for occupancy >= 90', () => {
      expect(getOccupancyColor(90)).toContain('red');
      expect(getOccupancyColor(100)).toContain('red');
    });

    it('returns yellow for occupancy >= 70', () => {
      expect(getOccupancyColor(70)).toContain('yellow');
      expect(getOccupancyColor(89)).toContain('yellow');
    });

    it('returns green for occupancy < 70', () => {
      expect(getOccupancyColor(0)).toContain('green');
      expect(getOccupancyColor(69)).toContain('green');
    });
  });
});
