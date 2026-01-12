/**
 * SettingsPage - Propagation module settings
 *
 * Main settings page with:
 * - Species configurations (propagation defaults by species)
 * - Data management (export, import, clear)
 */

import { useEffect } from 'react';
import { useSpeciesConfigs } from '../../stores/useSpeciesConfigs';
import { SpeciesConfigList } from './SpeciesConfigList';
import { DataManagement } from './DataManagement';

export function SettingsPage() {
  const { loadConfigs } = useSpeciesConfigs();

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Propagation Settings
      </h1>

      {/* Species Configurations */}
      <SpeciesConfigList />

      {/* Data Management */}
      <DataManagement />
    </div>
  );
}
