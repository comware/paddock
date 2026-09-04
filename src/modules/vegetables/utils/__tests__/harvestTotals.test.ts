import { describe, it, expect } from 'vitest';
import { summariseHarvests } from '../harvestTotals';
import type { VegHarvest } from '@/lib/db';

const pick = (over: Partial<VegHarvest> = {}): VegHarvest => ({
  plantingId: '1',
  date: new Date('2026-03-01'),
  quantity: 2,
  unit: 'kg',
  sellable: true,
  createdAt: new Date('2026-03-01'),
  ...over,
});

describe('summariseHarvests', () => {
  it('reports nothing picked for an empty log', () => {
    const s = summariseHarvests([]);
    expect(s.harvestCount).toBe(0);
    expect(s.totals).toEqual({});
    expect(s.firstHarvest).toBeUndefined();
    expect(s.lastHarvest).toBeUndefined();
    expect(s.daysHarvesting).toBe(0);
  });

  it('sums a single unit', () => {
    const s = summariseHarvests([pick({ quantity: 2 }), pick({ quantity: 3.5 })]);
    expect(s.totals).toEqual({ kg: 5.5 });
    expect(s.harvestCount).toBe(2);
  });

  it('keeps units apart rather than adding them together', () => {
    // A planting picked in both kg and bunches has no single meaningful total. Showing
    // one would be a number that means nothing.
    const s = summariseHarvests([
      pick({ quantity: 2, unit: 'kg' }),
      pick({ quantity: 6, unit: 'bunches' }),
    ]);
    expect(s.totals).toEqual({ kg: 2, bunches: 6 });
  });

  it('spans first to last pick, inclusive', () => {
    const s = summariseHarvests([
      pick({ date: new Date('2026-03-01') }),
      pick({ date: new Date('2026-03-15') }),
      pick({ date: new Date('2026-03-08') }),
    ]);
    expect(s.firstHarvest).toEqual(new Date('2026-03-01'));
    expect(s.lastHarvest).toEqual(new Date('2026-03-15'));
    expect(s.daysHarvesting).toBe(15); // inclusive of both ends
  });

  it('counts a single pick as one day, not zero', () => {
    const s = summariseHarvests([pick({ date: new Date('2026-03-01') })]);
    expect(s.daysHarvesting).toBe(1);
  });

  it('separates sellable from the rest', () => {
    const s = summariseHarvests([
      pick({ quantity: 4, sellable: true }),
      pick({ quantity: 1, sellable: false }),
    ]);
    expect(s.totals).toEqual({ kg: 5 });
    expect(s.sellableTotals).toEqual({ kg: 4 });
  });

  it('is not confused by picks arriving out of order', () => {
    const s = summariseHarvests([
      pick({ date: new Date('2026-03-20'), quantity: 1 }),
      pick({ date: new Date('2026-03-02'), quantity: 1 }),
    ]);
    expect(s.firstHarvest).toEqual(new Date('2026-03-02'));
    expect(s.lastHarvest).toEqual(new Date('2026-03-20'));
  });

  it('does not mutate the array it was given', () => {
    const picks = [pick({ date: new Date('2026-03-20') }), pick({ date: new Date('2026-03-02') })];
    const before = picks.map((p) => p.date.getTime());
    summariseHarvests(picks);
    expect(picks.map((p) => p.date.getTime())).toEqual(before);
  });
});
