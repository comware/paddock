/**
 * useTimeEntryMigration - One-time migration hook for orphan time entries
 *
 * Assigns time entries without a siteId to the default site.
 * Safe to call multiple times - only runs if orphan entries exist.
 */

import { useEffect, useState } from 'react';
import { useTimeEntries, useSites } from '../stores';

interface MigrationStatus {
  isRunning: boolean;
  isComplete: boolean;
  migratedCount: number;
  error: string | null;
}

export function useTimeEntryMigration(): MigrationStatus {
  const { entries, isLoading: entriesLoading, migrateOrphanEntries } = useTimeEntries();
  const { sites, isLoading: sitesLoading, ensureDefaultSite } = useSites();
  const [status, setStatus] = useState<MigrationStatus>({
    isRunning: false,
    isComplete: false,
    migratedCount: 0,
    error: null,
  });

  useEffect(() => {
    // Wait for both stores to load
    if (entriesLoading || sitesLoading) return;

    // Already running
    if (status.isRunning) return;

    // Check if migration is needed (always check, not just once)
    const orphanEntries = entries.filter((e) => !e.siteId);
    if (orphanEntries.length === 0) {
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

        // Migrate orphan entries
        const count = await migrateOrphanEntries(defaultSite.id);

        setStatus({
          isRunning: false,
          isComplete: true,
          migratedCount: count,
          error: null,
        });

        if (count > 0) {
          console.log(`Migrated ${count} time entries to default site: ${defaultSite.name}`);
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
  }, [entriesLoading, sitesLoading, entries, sites, status.isRunning, ensureDefaultSite, migrateOrphanEntries]);

  return status;
}
