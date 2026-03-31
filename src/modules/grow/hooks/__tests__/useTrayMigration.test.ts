import { describe, it, expect } from 'vitest';

describe('useTrayMigration', () => {
  it('module exports a hook function', async () => {
    const mod = await import('../useTrayMigration');
    expect(typeof mod.useTrayMigration).toBe('function');
  });

  it('hook is defined', async () => {
    const mod = await import('../useTrayMigration');
    expect(mod.useTrayMigration).toBeDefined();
  });

  it('module has no default export', async () => {
    const mod = await import('../useTrayMigration');
    expect(mod.default).toBeUndefined();
  });

  it('named export matches expected pattern', async () => {
    const mod = await import('../useTrayMigration');
    const exportNames = Object.keys(mod);
    expect(exportNames).toContain('useTrayMigration');
  });

  it('only exports the hook', async () => {
    const mod = await import('../useTrayMigration');
    const exportNames = Object.keys(mod).filter((k) => !k.startsWith('__'));
    expect(exportNames.length).toBe(1);
  });
});
