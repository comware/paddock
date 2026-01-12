/**
 * DataManagement - Propagation data management component
 *
 * Provides UI for:
 * - Export all propagation data as JSON backup
 * - Export batches as CSV for spreadsheet analysis
 * - Import from JSON backup (merge or replace)
 * - Clear all propagation data (with double confirmation)
 * - View raw data for debugging
 */

import { useRef, useState } from 'react';
import {
  downloadPropagationJSONBackup,
  downloadBatchesCSV,
  importPropagationFromJSON,
  clearAllPropagationData,
  getPropagationStats,
  getPropagationRawData,
} from '../../utils/exporters';
import { useBatches } from '../../stores/useBatches';
import { useStations } from '../../stores/useStations';
import { useMotherPlants } from '../../stores/useMotherPlants';
import { useSupplies } from '../../stores/useSupplies';
import { useGraduations } from '../../stores/useGraduations';
import { usePropagules } from '../../stores/usePropagules';
import { useSpeciesConfigs } from '../../stores/useSpeciesConfigs';
import { useBatchCosts } from '../../stores/useBatchCosts';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function DataManagement() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<string>('');
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0); // 0 = idle, 1 = first confirm, 2 = second confirm
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [showImportOptions, setShowImportOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store reloaders
  const { loadBatches } = useBatches();
  const { loadStations } = useStations();
  const { loadMotherPlants } = useMotherPlants();
  const { loadSupplies } = useSupplies();
  const { loadGraduations } = useGraduations();
  const { loadPropagules } = usePropagules();
  const { loadConfigs } = useSpeciesConfigs();
  const { loadCosts } = useBatchCosts();

  /**
   * Reload all stores after import/clear operations.
   */
  const reloadAllStores = async () => {
    await Promise.all([
      loadBatches(),
      loadStations(),
      loadMotherPlants(),
      loadSupplies(),
      loadGraduations(),
      loadPropagules(),
      loadConfigs(),
      loadCosts(),
    ]);
  };

  /**
   * Handle JSON export.
   */
  const handleExportJSON = async () => {
    setStatus('loading');
    setMessage('');
    try {
      await downloadPropagationJSONBackup();
      setStatus('success');
      setMessage('Propagation backup downloaded successfully');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  /**
   * Handle CSV export.
   */
  const handleExportCSV = async () => {
    setStatus('loading');
    setMessage('');
    try {
      await downloadBatchesCSV();
      setStatus('success');
      setMessage('Batches CSV exported successfully');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  /**
   * Show import options before file selection.
   */
  const handleImportClick = () => {
    setShowImportOptions(true);
  };

  /**
   * Proceed with import after mode selection.
   */
  const handleProceedImport = () => {
    setShowImportOptions(false);
    fileInputRef.current?.click();
  };

  /**
   * Handle file selection and import.
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('loading');
    setMessage('');
    try {
      const text = await file.text();
      const result = await importPropagationFromJSON(text, {
        merge: importMode === 'merge',
      });

      if (result.errors.length > 0) {
        setStatus('error');
        setMessage(result.errors.join(', '));
      } else {
        const total = Object.values(result.imported).reduce((a, b) => a + b, 0);
        setStatus('success');
        setMessage(
          `Imported ${total} records successfully` +
            (importMode === 'merge' ? ' (merged with existing data)' : '')
        );
        // Reload all stores
        await reloadAllStores();
      }
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }

    // Reset file input
    e.target.value = '';
  };

  /**
   * Handle clear data with double confirmation.
   */
  const handleClearClick = () => {
    setClearStep(1);
  };

  const handleClearFirstConfirm = () => {
    setClearStep(2);
  };

  const handleClearSecondConfirm = async () => {
    setStatus('loading');
    setMessage('');
    try {
      await clearAllPropagationData();
      setStatus('success');
      setMessage('All propagation data cleared');
      setClearStep(0);
      // Reload all stores
      await reloadAllStores();
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleClearCancel = () => {
    setClearStep(0);
  };

  /**
   * Handle debug view toggle.
   */
  const handleViewDebug = async () => {
    if (showDebug) {
      setShowDebug(false);
      setDebugData('');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const [stats, data] = await Promise.all([
        getPropagationStats(),
        getPropagationRawData(),
      ]);
      setDebugData(
        JSON.stringify(
          {
            statistics: stats,
            data,
          },
          null,
          2
        )
      );
      setShowDebug(true);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Data Management
      </h2>

      {/* Status message */}
      {status !== 'idle' && status !== 'loading' && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            status === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-3">
        {/* Export JSON */}
        <button
          type="button"
          onClick={handleExportJSON}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            Export Propagation Data
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Download all propagation data as JSON backup
          </div>
        </button>

        {/* Export CSV */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            Export Batches CSV
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Export batch data as spreadsheet for analysis
          </div>
        </button>

        {/* Import JSON */}
        {!showImportOptions ? (
          <button
            type="button"
            onClick={handleImportClick}
            disabled={status === 'loading'}
            className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <div className="font-medium text-slate-900 dark:text-white">
              Import Propagation Data
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Restore from JSON backup
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-blue-700 dark:text-blue-300 font-medium mb-3">
              Choose import mode:
            </p>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>Replace</strong> - Clear existing data and import backup
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>Merge</strong> - Add backup data to existing data
                </span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleProceedImport}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Select File
              </button>
              <button
                type="button"
                onClick={() => setShowImportOptions(false)}
                className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Debug Mode */}
        <button
          type="button"
          onClick={handleViewDebug}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            {showDebug ? 'Hide' : 'View'} Raw Data
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Debug mode - inspect database contents
          </div>
        </button>

        {/* Debug Data Display */}
        {showDebug && debugData && (
          <div className="mt-4 p-4 bg-slate-900 dark:bg-slate-950 rounded-lg overflow-auto max-h-96">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {debugData}
            </pre>
          </div>
        )}
      </div>

      {/* Clear Data - Danger Zone */}
      <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-800">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
          Danger Zone
        </h3>

        {clearStep === 0 && (
          <button
            type="button"
            onClick={handleClearClick}
            className="w-full p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="font-medium">Clear All Propagation Data</div>
            <div className="text-sm opacity-75">
              Permanently delete all batches, stations, mother plants, and related data
            </div>
          </button>
        )}

        {clearStep === 1 && (
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
            <p className="text-red-700 dark:text-red-300 font-medium mb-3">
              Are you sure you want to delete ALL propagation data?
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">
              This will remove all batches, stations, mother plants, supplies, costs,
              graduations, and related records.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClearFirstConfirm}
                disabled={status === 'loading'}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Yes, I Want to Delete
              </button>
              <button
                type="button"
                onClick={handleClearCancel}
                className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {clearStep === 2 && (
          <div className="p-4 rounded-lg bg-red-200 dark:bg-red-900/50 border-2 border-red-500 dark:border-red-600">
            <p className="text-red-800 dark:text-red-200 font-bold mb-3">
              FINAL WARNING: This cannot be undone!
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              Consider exporting a backup first. Click &quot;Delete Everything&quot; to permanently
              erase all propagation data.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClearSecondConfirm}
                disabled={status === 'loading'}
                className="flex-1 py-2 px-4 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 font-bold"
              >
                {status === 'loading' ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button
                type="button"
                onClick={handleClearCancel}
                className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
