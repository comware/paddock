import { describe, it, expect } from 'vitest';
import { VALID_STAGE_TRANSITIONS } from '../enums';
import type { PropagationStage } from '../enums';

describe('propagation enums', () => {
  describe('VALID_STAGE_TRANSITIONS', () => {
    it('has transitions for all stages', () => {
      const stages: PropagationStage[] = ['taken', 'rooting', 'rooted', 'potted_up', 'hardening', 'ready', 'graduated', 'failed'];
      for (const stage of stages) {
        expect(VALID_STAGE_TRANSITIONS[stage]).toBeDefined();
      }
    });

    it('allows taken to transition to rooting', () => {
      expect(VALID_STAGE_TRANSITIONS.taken).toContain('rooting');
    });

    it('allows every active stage to fail', () => {
      const activeStages: PropagationStage[] = ['taken', 'rooting', 'rooted', 'potted_up', 'hardening'];
      for (const stage of activeStages) {
        expect(VALID_STAGE_TRANSITIONS[stage]).toContain('failed');
      }
    });

    it('graduated and failed are terminal stages', () => {
      expect(VALID_STAGE_TRANSITIONS.graduated).toEqual([]);
      expect(VALID_STAGE_TRANSITIONS.failed).toEqual([]);
    });

    it('ready can transition to graduated', () => {
      expect(VALID_STAGE_TRANSITIONS.ready).toContain('graduated');
    });
  });
});
