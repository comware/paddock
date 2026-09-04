/**
 * useTrayMigration - One-time migration hook for orphan trays
 *
 * Assigns trays without a siteId to the default site.
 * Safe to call multiple times - only runs if orphan trays exist.
 */

import { useEffect, useState } from 'react';
import { useTrays, useSites } from '../stores';

interface MigrationStatus {
  isRunning: boolean;
  isComplete: boolean;
  migratedCount: number;
  error: string | null;
}

export function useTrayMigration(): MigrationStatus {
  const { trays, isLoading: traysLoading, migrateOrphanTrays } = useTrays();
  const { sites, isLoading: sitesLoading, ensureDefaultSite } = useSites();
  const [status, setStatus] = useState<MigrationStatus>({
    isRunning: false,
    isComplete: false,
    migratedCount: 0,
    error: null,
  });

  useEffect(() => {
    // Wait for both stores to load
    if (traysLoading || sitesLoading) return;

    // Already running
    if (status.isRunning) return;

    // Check if migration is needed (always check, not just once)
    const orphanTrays = trays.filter((t) => !t.siteId);
    if (orphanTrays.length === 0) {
      if (!status.isComplete) {
        setStatus((s) => ({ ...s, isComplete: true }));
      }
      return;
    }

    // Run migration
    const runMigration = async () => {
      setStatus((s) => ({ ...s, isRunning: true }));

      try {
        // Ensure we have a default site
        const defaultSite = await ensureDefaultSite();
        if (!defaultSite.id) {
          throw new Error('Failed to get default site');
        }

        // Migrate orphan trays
        const count = await migrateOrphanTrays(defaultSite.id);

        setStatus({
          isRunning: false,
          isComplete: true,
          migratedCount: count,
          error: null,
        });

        if (count > 0) {
          if (import.meta.env.DEV) console.log(`Migrated ${count} trays to default site: ${defaultSite.name}`);
        }
      } catch (error) {
        setStatus({
          isRunning: false,
          isComplete: true,
          migratedCount: 0,
          error: (error as Error).message,
        });
      }
    };

    runMigration();
  }, [traysLoading, sitesLoading, trays, sites, status.isRunning, ensureDefaultSite, migrateOrphanTrays]);

  return status;
}
