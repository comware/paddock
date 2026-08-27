/**
 * Settings Module - Platform Settings
 *
 * Handles data export/import, preferences, experiment config, and variety management.
 * Wrapped in ErrorBoundary for module isolation.
 */

import { AISettings, DataExport, Preferences, ExperimentConfig, VarietyManager, ModuleSettings } from './components';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function SettingsModuleContent() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Preferences */}
        <Preferences />

        {/* Which modules to show */}
        <ModuleSettings />

        {/* AI Assistant */}
        <AISettings />

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

export default function SettingsModule() {
  return (
    <ErrorBoundary
      section="Settings"
      module="settings"
      showModuleNav
    >
      <SettingsModuleContent />
    </ErrorBoundary>
  );
}
