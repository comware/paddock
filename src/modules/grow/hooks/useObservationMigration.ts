/**
 * useObservationMigration - One-time migration hook for orphan observations
 *
 * Assigns observations without a siteId to the default site.
 * Safe to call multiple times - only runs if orphan observations exist.
 */

import { useEffect, useState } from 'react';
import { useObservations, useSites } from '../stores';

interface MigrationStatus {
  isRunning: boolean;
  isComplete: boolean;
  migratedCount: number;
  error: string | null;
}

export function useObservationMigration(): MigrationStatus {
  const { observations, isLoading: observationsLoading, migrateOrphanObservations } = useObservations();
  const { sites, isLoading: sitesLoading, ensureDefaultSite } = useSites();
  const [status, setStatus] = useState<MigrationStatus>({
    isRunning: false,
    isComplete: false,
    migratedCount: 0,
    error: null,
  });

  useEffect(() => {
    // Wait for both stores to load
    if (observationsLoading || sitesLoading) return;

    // Already running
    if (status.isRunning) return;

    // Check if migration is needed (always check, not just once)
    const orphanObservations = observations.filter((o) => !o.siteId);
    if (orphanObservations.length === 0) {
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

        // Migrate orphan observations
        const count = await migrateOrphanObservations(defaultSite.id);

        setStatus({
          isRunning: false,
          isComplete: true,
          migratedCount: count,
          error: null,
        });

        if (count > 0) {
          console.log(`Migrated ${count} observations to default site: ${defaultSite.name}`);
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
  }, [observationsLoading, sitesLoading, observations, sites, status.isRunning, ensureDefaultSite, migrateOrphanObservations]);

  return status;
}
