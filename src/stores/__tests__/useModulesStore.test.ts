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

/** The enabled-modules row, found by key rather than position. */
const storedModules = () => settings.find((x) => x.key === 'enabled_modules');

/** Pretend the one-time growing-module backfill has already run. */
const backfillAlreadyDone = () =>
  settings.push({ id: '99', key: 'enabled_modules_growing_backfill', value: true } as PlatformSetting);

beforeEach(() => {
  settings = [];
  nextId = 1;
  useModulesStore.setState({ enabled: ['microgreens'], isLoaded: false });
});

describe('module enablement', () => {
  it('starts with the three growing modules', async () => {
    await store().load();

    // Microgreens, vegetables and propagation are the enterprises Paddock models. Sales
    // and the rest stay off - they are placeholders, and a nav full of "coming soon"
    // teaches a new grower the app is mostly empty.
    expect(store().enabled).toEqual(
      expect.arrayContaining(['microgreens', 'propagation', 'vegetables'])
    );
    expect(store().isEnabled('sales')).toBe(false);
  });

  it('turns a module on and persists it', async () => {
    await store().load();
    await store().setEnabled('sales', true);

    expect(store().isEnabled('sales')).toBe(true);
    expect(storedModules()?.value).toContain('sales');
  });

  it('turns a module off and persists it', async () => {
    await store().load();
    await store().setEnabled('propagation', true);
    await store().setEnabled('propagation', false);

    expect(store().isEnabled('propagation')).toBe(false);
    expect(storedModules()?.value).not.toContain('propagation');
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
    backfillAlreadyDone();
    await store().load();

    expect(store().enabled).toEqual(expect.arrayContaining(['microgreens', 'finance']));
    // Propagation stays off: the one-time backfill has already run for this install, so
    // its absence is the grower's choice rather than a gap.
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

    expect(settings.filter((x) => x.key === 'enabled_modules')).toHaveLength(1);
  });

  it('defines a path, icon and description for every module', () => {
    for (const module of MODULE_DEFINITIONS) {
      expect(module.path).toMatch(/^\//);
      expect(module.Icon).toBeTruthy();
      expect(module.description).toBeTruthy();
    }
  });
});

describe('enabling the growing modules by default', () => {
  it('gives a fresh install all three growing modules', async () => {
    settings = [];

    await store().load();

    expect(store().enabled).toEqual(
      expect.arrayContaining(['microgreens', 'propagation', 'vegetables'])
    );
  });

  it('adds them to an install that predates them, and persists the addition', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['microgreens'] } as PlatformSetting];

    await store().load();

    expect(store().enabled).toEqual(
      expect.arrayContaining(['microgreens', 'propagation', 'vegetables'])
    );
    const stored = settings.find((x) => x.key === 'enabled_modules');
    expect(stored?.value).toEqual(expect.arrayContaining(['propagation', 'vegetables']));
  });

  it('carries a renamed id forward and adds the new modules in the same pass', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['grow'] } as PlatformSetting];

    await store().load();

    expect(store().enabled).toEqual(
      expect.arrayContaining(['microgreens', 'propagation', 'vegetables'])
    );
    expect(store().enabled).not.toContain('grow');
  });

  it('only adds them once, so turning one off afterwards sticks', async () => {
    // The whole reason this is a one-time backfill rather than a floor: a module the
    // grower has deliberately switched off must stay off across reloads.
    settings = [{ id: '1', key: 'enabled_modules', value: ['microgreens'] } as PlatformSetting];
    await store().load();
    expect(store().isEnabled('propagation')).toBe(true);

    await store().setEnabled('propagation', false);
    await store().load();

    expect(store().isEnabled('propagation')).toBe(false);
    expect(store().isEnabled('vegetables')).toBe(true);
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

describe('vegetables module', () => {
  it('survives a round trip through load() when stored', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['microgreens', 'vegetables'] } as PlatformSetting];

    await store().load();

    expect(store().isEnabled('vegetables')).toBe(true);
  });

  it('appears in MODULE_DEFINITIONS without being required', () => {
    const vegetables = MODULE_DEFINITIONS.find((m) => m.id === 'vegetables');
    expect(vegetables).toBeDefined();
    expect(vegetables?.required).toBeUndefined();
  });
});
