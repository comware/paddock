import { describe, it, expect } from 'vitest';

describe('Supplies index', () => {
  it('exports SupplyList', async () => {
    const mod = await import('../index');
    expect(mod.SupplyList).toBeDefined();
  });

  it('exports SupplyForm', async () => {
    const mod = await import('../index');
    expect(mod.SupplyForm).toBeDefined();
  });

  it('exports SupplyDetail', async () => {
    const mod = await import('../index');
    expect(mod.SupplyDetail).toBeDefined();
  });

  it('exports SupplyCard', async () => {
    const mod = await import('../index');
    expect(mod.SupplyCard).toBeDefined();
  });

  it('exports are functions (React components)', async () => {
    const mod = await import('../index');
    expect(typeof mod.SupplyList).toBe('function');
    expect(typeof mod.SupplyForm).toBe('function');
  });
});
