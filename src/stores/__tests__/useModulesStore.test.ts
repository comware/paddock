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
  useModulesStore.setState({ enabled: ['grow'], isLoaded: false });
});

describe('module enablement', () => {
  it('starts with Grow alone', async () => {
    await store().load();

    // A first-time grower is tracking trays. Everything else is something they may grow
    // into, and can switch on when they do.
    expect(store().enabled).toEqual(['grow']);
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

  it('refuses to turn off a required module', async () => {
    await store().load();
    await store().setEnabled('grow', false);

    // Disabling every module would empty the navigation, including the route back to
    // the settings screen that could undo it.
    expect(store().isEnabled('grow')).toBe(true);
  });

  it('restores a saved selection', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['grow', 'finance'] }];
    await store().load();

    expect(store().enabled).toEqual(expect.arrayContaining(['grow', 'finance']));
    expect(store().isEnabled('propagation')).toBe(false);
  });

  it('always includes required modules, even if storage omits them', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['finance'] }];
    await store().load();

    expect(store().isEnabled('grow')).toBe(true);
  });

  it('ignores unknown module ids in storage', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: ['grow', 'nonsense'] }];
    await store().load();

    expect(store().enabled).not.toContain('nonsense');
  });

  it('falls back to defaults when storage holds something unexpected', async () => {
    settings = [{ id: '1', key: 'enabled_modules', value: 'not an array' }];
    await store().load();

    expect(store().isEnabled('grow')).toBe(true);
    expect(store().enabled.length).toBeGreaterThan(0);
  });

  it('updates the existing row rather than adding a second', async () => {
    await store().load();
    await store().setEnabled('sales', true);
    await store().setEnabled('markets', true);

    expect(settings).toHaveLength(1);
  });

  it('defines a path and icon for every module', () => {
    for (const module of MODULE_DEFINITIONS) {
      expect(module.path).toMatch(/^\//);
      expect(module.icon).toBeTruthy();
      expect(module.description).toBeTruthy();
    }
  });
});
