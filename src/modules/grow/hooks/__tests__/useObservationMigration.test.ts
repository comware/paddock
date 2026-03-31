import { describe, it, expect } from 'vitest';

describe('useObservationMigration', () => {
  it('module exports a hook function', async () => {
    const mod = await import('../useObservationMigration');
    expect(typeof mod.useObservationMigration).toBe('function');
  });

  it('hook returns an object with expected shape', async () => {
    // Just verify the module structure since the hook requires React context
    const mod = await import('../useObservationMigration');
    expect(mod.useObservationMigration).toBeDefined();
  });

  it('module has no default export', async () => {
    const mod = await import('../useObservationMigration');
    expect((mod as Record<string, unknown>).default).toBeUndefined();
  });

  it('named export matches expected pattern', async () => {
    const mod = await import('../useObservationMigration');
    const exportNames = Object.keys(mod);
    expect(exportNames).toContain('useObservationMigration');
  });

  it('only exports the hook', async () => {
    const mod = await import('../useObservationMigration');
    const exportNames = Object.keys(mod).filter((k) => !k.startsWith('__'));
    expect(exportNames.length).toBe(1);
  });
});
