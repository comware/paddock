/**
 * Settings Module - Platform Settings
 *
 * Handles data export/import, preferences, experiment config, and variety management.
 */

import { DataExport, Preferences, ExperimentConfig, VarietyManager } from './components';

export default function SettingsModule() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Preferences */}
        <Preferences />

        {/* Experiment Configuration */}
        <ExperimentConfig />

        {/* Variety Management */}
        <VarietyManager />

        {/* Data Management */}
        <DataExport />
      </div>
    </div>
  );
}
