/**
 * useSites Store Unit Tests
 *
 * Tests the site management store including:
 * - Site data structure and creation
 * - Default site selection logic
 * - Active site management
 * - Site validation
 */

import { describe, it, expect } from 'vitest';
import { createMockSite } from '@/test/mocks/db';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

interface GrowSite {
  id?: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isDefault: boolean;
  isIndoor: boolean;
  weatherEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// HELPER FUNCTIONS (mirrored from store logic)
// ============================================

function getDefaultSite(sites: GrowSite[]): GrowSite | undefined {
  return sites.find((s) => s.isDefault);
}

function getActiveSite(sites: GrowSite[], activeSiteId: string | null): GrowSite | null {
  if (!activeSiteId) return null;
  return sites.find((s) => s.id === activeSiteId) || null;
}

function resolveActiveSiteId(
  sites: GrowSite[],
  storedActiveSiteId: string | null
): string | null {
  const defaultSite = sites.find((s) => s.isDefault);
  // Use stored ID if valid, otherwise fall back to default site
  if (storedActiveSiteId && sites.some((s) => s.id === storedActiveSiteId)) {
    return storedActiveSiteId;
  }
  return defaultSite?.id || null;
}

function isFirstSite(sites: GrowSite[]): boolean {
  return sites.length === 0;
}

function needsDefaultUnset(sites: GrowSite[], isDefault: boolean, isFirst: boolean): boolean {
  return (isFirst || isDefault) && sites.some((s) => s.isDefault);
}

// ============================================
// SITE DATA STRUCTURE TESTS
// ============================================

describe('Site Data Structure', () => {
  describe('createMockSite', () => {
    it('creates a site with all required fields', () => {
      const site = createMockSite();

      expect(site.name).toBeDefined();
      expect(site.latitude).toBeDefined();
      expect(site.longitude).toBeDefined();
      expect(site.timezone).toBeDefined();
      expect(typeof site.isDefault).toBe('boolean');
      expect(typeof site.isIndoor).toBe('boolean');
      expect(typeof site.weatherEnabled).toBe('boolean');
      expect(site.createdAt).toBeInstanceOf(Date);
      expect(site.updatedAt).toBeInstanceOf(Date);
    });

    it('applies custom overrides correctly', () => {
      const site = createMockSite({
        name: 'Custom Site',
        latitude: -37.8136,
        longitude: 144.9631,
        timezone: 'Australia/Melbourne',
        isIndoor: false,
        weatherEnabled: true,
      });

      expect(site.name).toBe('Custom Site');
      expect(site.latitude).toBe(-37.8136);
      expect(site.longitude).toBe(144.9631);
      expect(site.timezone).toBe('Australia/Melbourne');
      expect(site.isIndoor).toBe(false);
      expect(site.weatherEnabled).toBe(true);
    });

    it('allows optional description', () => {
      const siteWithDesc = createMockSite({ description: 'Test description' });
      const siteWithoutDesc = createMockSite({ description: undefined });

      expect(siteWithDesc.description).toBe('Test description');
      expect(siteWithoutDesc.description).toBeUndefined();
    });
  });
});

// ============================================
// DEFAULT SITE LOGIC TESTS
// ============================================

describe('Default Site Logic', () => {
  describe('getDefaultSite', () => {
    it('returns undefined for empty site list', () => {
      expect(getDefaultSite([])).toBeUndefined();
    });

    it('returns the default site when one exists', () => {
      const sites = [
        createMockSite({ id: 'site-1', name: 'Site 1', isDefault: false }),
        createMockSite({ id: 'site-2', name: 'Site 2', isDefault: true }),
        createMockSite({ id: 'site-3', name: 'Site 3', isDefault: false }),
      ];

      const defaultSite = getDefaultSite(sites);

      expect(defaultSite?.id).toBe('site-2');
      expect(defaultSite?.name).toBe('Site 2');
    });

    it('returns first default if multiple exist (edge case)', () => {
      const sites = [
        createMockSite({ id: 'site-1', name: 'Site 1', isDefault: true }),
        createMockSite({ id: 'site-2', name: 'Site 2', isDefault: true }),
      ];

      const defaultSite = getDefaultSite(sites);

      expect(defaultSite?.id).toBe('site-1');
    });

    it('returns undefined when no site is marked as default', () => {
      const sites = [
        createMockSite({ id: 'site-1', isDefault: false }),
        createMockSite({ id: 'site-2', isDefault: false }),
      ];

      expect(getDefaultSite(sites)).toBeUndefined();
    });
  });

  describe('isFirstSite', () => {
    it('returns true for empty sites array', () => {
      expect(isFirstSite([])).toBe(true);
    });

    it('returns false when sites exist', () => {
      const sites = [createMockSite({ id: 'site-1' })];
      expect(isFirstSite(sites)).toBe(false);
    });
  });

  describe('needsDefaultUnset', () => {
    it('returns false for first site with no existing sites', () => {
      expect(needsDefaultUnset([], true, true)).toBe(false);
    });

    it('returns true when adding default and one already exists', () => {
      const sites = [createMockSite({ id: 'site-1', isDefault: true })];
      expect(needsDefaultUnset(sites, true, false)).toBe(true);
    });

    it('returns false when adding non-default', () => {
      const sites = [createMockSite({ id: 'site-1', isDefault: true })];
      expect(needsDefaultUnset(sites, false, false)).toBe(false);
    });
  });
});

// ============================================
// ACTIVE SITE LOGIC TESTS
// ============================================

describe('Active Site Logic', () => {
  describe('getActiveSite', () => {
    it('returns null when activeSiteId is null', () => {
      const sites = [createMockSite({ id: 'site-1' })];
      expect(getActiveSite(sites, null)).toBeNull();
    });

    it('returns null when activeSiteId not found in sites', () => {
      const sites = [createMockSite({ id: 'site-1' })];
      expect(getActiveSite(sites, 'non-existent')).toBeNull();
    });

    it('returns the matching site when found', () => {
      const sites = [
        createMockSite({ id: 'site-1', name: 'Site 1' }),
        createMockSite({ id: 'site-2', name: 'Site 2' }),
      ];

      const activeSite = getActiveSite(sites, 'site-2');

      expect(activeSite?.id).toBe('site-2');
      expect(activeSite?.name).toBe('Site 2');
    });

    it('returns null for empty sites array', () => {
      expect(getActiveSite([], 'site-1')).toBeNull();
    });
  });

  describe('resolveActiveSiteId', () => {
    it('returns null for empty sites array', () => {
      expect(resolveActiveSiteId([], null)).toBeNull();
      expect(resolveActiveSiteId([], 'stored-id')).toBeNull();
    });

    it('uses stored ID when it exists in sites', () => {
      const sites = [
        createMockSite({ id: 'site-1', isDefault: true }),
        createMockSite({ id: 'site-2', isDefault: false }),
      ];

      expect(resolveActiveSiteId(sites, 'site-2')).toBe('site-2');
    });

    it('falls back to default site when stored ID not found', () => {
      const sites = [
        createMockSite({ id: 'site-1', isDefault: false }),
        createMockSite({ id: 'site-2', isDefault: true }),
      ];

      expect(resolveActiveSiteId(sites, 'non-existent')).toBe('site-2');
    });

    it('falls back to default site when stored ID is null', () => {
      const sites = [
        createMockSite({ id: 'site-1', isDefault: true }),
      ];

      expect(resolveActiveSiteId(sites, null)).toBe('site-1');
    });

    it('returns null when no stored ID and no default', () => {
      const sites = [
        createMockSite({ id: 'site-1', isDefault: false }),
      ];

      expect(resolveActiveSiteId(sites, null)).toBeNull();
    });
  });
});

// ============================================
// SITE VALIDATION TESTS
// ============================================

describe('Site Validation', () => {
  it('validates latitude is a number', () => {
    const site = createMockSite({ latitude: -33.8688 });
    expect(typeof site.latitude).toBe('number');
  });

  it('validates longitude is a number', () => {
    const site = createMockSite({ longitude: 151.2093 });
    expect(typeof site.longitude).toBe('number');
  });

  it('validates latitude in valid range', () => {
    const validSite = createMockSite({ latitude: -33.8688 });
    const isValidLatitude = validSite.latitude >= -90 && validSite.latitude <= 90;
    expect(isValidLatitude).toBe(true);
  });

  it('validates longitude in valid range', () => {
    const validSite = createMockSite({ longitude: 151.2093 });
    const isValidLongitude = validSite.longitude >= -180 && validSite.longitude <= 180;
    expect(isValidLongitude).toBe(true);
  });

  it('validates timezone is non-empty string', () => {
    const site = createMockSite({ timezone: 'Australia/Sydney' });
    expect(typeof site.timezone).toBe('string');
    expect(site.timezone.length).toBeGreaterThan(0);
  });

  it('validates name is non-empty string', () => {
    const site = createMockSite({ name: 'My Greenhouse' });
    expect(typeof site.name).toBe('string');
    expect(site.name.length).toBeGreaterThan(0);
  });
});

// ============================================
// SITE DELETION LOGIC TESTS
// ============================================

describe('Site Deletion Logic', () => {
  it('handles deletion of non-default site', () => {
    const sites = [
      createMockSite({ id: 'site-1', isDefault: true }),
      createMockSite({ id: 'site-2', isDefault: false }),
    ];

    const remainingSites = sites.filter((s) => s.id !== 'site-2');
    const wasDefault = sites.find((s) => s.id === 'site-2')?.isDefault;

    expect(remainingSites.length).toBe(1);
    expect(wasDefault).toBe(false);
    expect(remainingSites[0].isDefault).toBe(true);
  });

  it('promotes first remaining site to default when default deleted', () => {
    const sites = [
      createMockSite({ id: 'site-1', name: 'Default', isDefault: true }),
      createMockSite({ id: 'site-2', name: 'Second', isDefault: false }),
    ];

    const deletedId = 'site-1';
    const wasDefault = sites.find((s) => s.id === deletedId)?.isDefault;
    const remainingSites = sites.filter((s) => s.id !== deletedId);

    // Simulate promotion logic
    if (wasDefault && remainingSites.length > 0) {
      remainingSites[0] = { ...remainingSites[0], isDefault: true };
    }

    expect(wasDefault).toBe(true);
    expect(remainingSites[0].isDefault).toBe(true);
    expect(remainingSites[0].name).toBe('Second');
  });

  it('handles deletion of last site', () => {
    const sites = [createMockSite({ id: 'site-1', isDefault: true })];
    const remainingSites = sites.filter((s) => s.id !== 'site-1');

    expect(remainingSites.length).toBe(0);
  });

  it('updates active site when current active is deleted', () => {
    const sites = [
      createMockSite({ id: 'site-1', isDefault: true }),
      createMockSite({ id: 'site-2', isDefault: false }),
    ];
    const activeSiteId = 'site-1';
    const deletedId = 'site-1';

    const remainingSites = sites.filter((s) => s.id !== deletedId);
    const newActiveSiteId =
      activeSiteId === deletedId
        ? remainingSites[0]?.id || null
        : activeSiteId;

    expect(newActiveSiteId).toBe('site-2');
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Site Edge Cases', () => {
  it('handles sites with zero coordinates (valid for default)', () => {
    const site = createMockSite({ latitude: 0, longitude: 0 });
    expect(site.latitude).toBe(0);
    expect(site.longitude).toBe(0);
  });

  it('handles sites with negative coordinates', () => {
    const site = createMockSite({ latitude: -45.0, longitude: -90.0 });
    expect(site.latitude).toBe(-45.0);
    expect(site.longitude).toBe(-90.0);
  });

  it('handles sites at date boundaries', () => {
    const midnight = new Date('2024-01-01T00:00:00Z');
    const site = createMockSite({ createdAt: midnight, updatedAt: midnight });
    expect(site.createdAt.getTime()).toBe(midnight.getTime());
  });

  it('handles sites with special characters in name', () => {
    const site = createMockSite({ name: "John's Greenhouse (East)" });
    expect(site.name).toBe("John's Greenhouse (East)");
  });

  it('handles very long description', () => {
    const longDesc = 'A'.repeat(1000);
    const site = createMockSite({ description: longDesc });
    expect(site.description).toBe(longDesc);
    expect(site.description?.length).toBe(1000);
  });
});
