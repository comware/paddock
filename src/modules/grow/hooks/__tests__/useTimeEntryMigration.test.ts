import { describe, it, expect } from 'vitest';

describe('useTimeEntryMigration', () => {
  it('module exports a hook function', async () => {
    const mod = await import('../useTimeEntryMigration');
    expect(typeof mod.useTimeEntryMigration).toBe('function');
  });

  it('hook is defined', async () => {
    const mod = await import('../useTimeEntryMigration');
    expect(mod.useTimeEntryMigration).toBeDefined();
  });

  it('module has no default export', async () => {
    const mod = await import('../useTimeEntryMigration');
    expect((mod as Record<string, unknown>).default).toBeUndefined();
  });

  it('named export matches expected pattern', async () => {
    const mod = await import('../useTimeEntryMigration');
    const exportNames = Object.keys(mod);
    expect(exportNames).toContain('useTimeEntryMigration');
  });

  it('only exports the hook', async () => {
    const mod = await import('../useTimeEntryMigration');
    const exportNames = Object.keys(mod).filter((k) => !k.startsWith('__'));
    expect(exportNames.length).toBe(1);
  });
});
