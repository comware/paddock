/**
 * Tests for module enablement.
 *
 * The failure that matters here is an install with nothing enabled: the navigation
 * empties, and with it the route back to the screen that would fix it.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PlatformSetting } from '@/lib/db';

let settings: PlatformSetting[] = [];
let nextId = 1;

vi.mock('@/lib/db', () => ({
  platformDb: {
    settings: {
      where: () => ({
        equals: (key: unknown) => ({
          first: async () => settings.find((s) => s.key === key),
        }),
      }),
      add: vi.fn(async (row: PlatformSetting) => {
        settings.push({ ...row, id: String(nextId++) });
      }),
      update: vi.fn(async (id: string, changes: Partial<PlatformSetting>) => {
        const row = settings.find((s) => String(s.id) === String(id));
        if (row) Object.assign(row, changes);
      }),
    },
  },
}));

const { useModulesStore, MODULE_DEFINITIONS } = await import('../useModulesStore');

const store = () => useModulesStore.getState();

beforeEach(() => {
  settings = [];
  nextId = 1;
  useModulesStore.setState({ enabled: ['microgreens'], isLoaded: false });
});

describe('module enablement', () => {
  it('starts with Microgreens alone', async () => {
    await store().load();

    // A first-time grower is tracking trays. Everything else is something they may grow
    // into, and can switch on when they do.
    expect(store().enabled).toEqual(['microgreens']);
  });

  it('turns a module on and persists it', async () => {
    await store().load();
    await store().setEnabled('sales', true);

    expect(store().isEnabled('sales')).toBe(true);
    expect(settings[0].value).toContain('sales');
  });

  it('turns a module off and persists it', async () => {
    await store().load();
    await store().setEnabled('propagation', true);
    await store().setEnabled('propagation', false);

    expect(store().isEnabled('propagation')).toBe(false);
    expect(settings[0].value).not.toContain('propagation');
  });

  it('lets microgreens be turned off, now that nothing is required', async () => {
    await store().load();
    await store().setEnabled('microgreens', false);

    // Grow used to be required because every other module fed it. Vegetables is coming
    // as a sibling rather than a dependent, so nothing is required any more.
    expect(store().isEnabled('microgreens')).toBe(false);
  });

  it('restores a saved selection', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['microgreens', 'finance'] }];
    await store().load();

    expect(store().enabled).toEqual(expect.arrayContaining(['microgreens', 'finance']));
    expect(store().isEnabled('propagation')).toBe(false);
  });

  it('ignores unknown module ids in storage', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['microgreens', 'nonsense'] }];
    await store().load();

    expect(store().enabled).not.toContain('nonsense');
  });

  it('falls back to defaults when storage holds something unexpected', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: 'not an array' }];
    await store().load();

    expect(store().isEnabled('microgreens')).toBe(true);
    expect(store().enabled.length).toBeGreaterThan(0);
  });

  it('updates the existing row rather than adding a second', async () => {
    await store().load();
    await store().setEnabled('sales', true);
    await store().setEnabled('markets', true);

    expect(settings).toHaveLength(1);
  });

  it('defines a path, icon and description for every module', () => {
    for (const module of MODULE_DEFINITIONS) {
      expect(module.path).toMatch(/^\//);
      expect(module.Icon).toBeTruthy();
      expect(module.description).toBeTruthy();
    }
  });
});

describe('renaming grow to microgreens', () => {
  it('carries an existing install forward', async () => {
    // What every install created before the rename has stored.
    settings = [{ id: '1', key: 'enabled_modules', value: ['grow', 'propagation'] } as PlatformSetting];

    await store().load();

    expect(store().enabled).toContain('microgreens');
    expect(store().enabled).toContain('propagation');
    expect(store().enabled).not.toContain('grow');
  });

  it('never leaves a user with an empty navigation', async () => {
    // The failure this migration prevents: 'grow' no longer matches a module id, gets
    // filtered out, and with `required` gone nothing puts it back.
    settings = [{ id: '1', key: 'enabled_modules', value: ['grow'] } as PlatformSetting];

    await store().load();

    expect(store().enabled.length).toBeGreaterThan(0);
  });

  it('persists the migrated value, so it converts only once', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['grow'] } as PlatformSetting];

    await store().load();

    expect(settings[0].value).toContain('microgreens');
    expect(settings[0].value).not.toContain('grow');
  });

  it('lets microgreens be turned off, unlike grow', () => {
    const microgreens = MODULE_DEFINITIONS.find((m) => m.id === 'microgreens');
    expect(microgreens).toBeDefined();
    expect(microgreens?.required).toBeUndefined();
  });
});
