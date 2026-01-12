/**
 * SettingsPage - Propagation module settings
 *
 * Main settings page that loads species configurations.
 * Handles data loading and provides the settings UI.
 */

import { useEffect } from 'react';
import { useSpeciesConfigs } from '../../stores/useSpeciesConfigs';
import { SpeciesConfigList } from './SpeciesConfigList';

export function SettingsPage() {
  const { loadConfigs } = useSpeciesConfigs();

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return (
    <div className="max-w-4xl mx-auto">
      <SpeciesConfigList />
    </div>
  );
}
