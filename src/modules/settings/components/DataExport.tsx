/**
 * DataExport - Data management section
 *
 * Export/import JSON backups, export CSV, clear data, view raw data.
 */

import { useRef, useState } from 'react';
import { useToastStore } from '@/stores/useToastStore';
import {
  downloadJSONBackup,
  downloadTraysCSV,
  importFromJSON,
  clearAllData,
  getDatabaseStats,
  getRawData,
} from '@/lib/utils/exporters';
import { downloadUnifiedBackup } from '@/lib/utils/unifiedExporter';
import { seedDatabase } from '@/lib/db';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function DataExport() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToastStore();

  const handleExportJSON = async () => {
    setStatus('loading');
    try {
      await downloadJSONBackup();
      setStatus('success');
      setMessage('Backup downloaded successfully');
      toast.add('Backup downloaded successfully', 'success');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleExportUnified = async () => {
    setStatus('loading');
    try {
      await downloadUnifiedBackup();
      setStatus('success');
      setMessage('Full backup (Microgreens + Propagation) downloaded successfully');
      toast.add('Full backup downloaded successfully', 'success');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleExportCSV = async () => {
    setStatus('loading');
    try {
      await downloadTraysCSV();
      setStatus('success');
      setMessage('CSV exported successfully');
      toast.add('CSV exported successfully', 'success');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('loading');
    try {
      const text = await file.text();
      const result = await importFromJSON(text);

      if (result.errors.length > 0) {
        setStatus('error');
        setMessage(result.errors.join(', '));
      } else {
        const total = Object.values(result.imported).reduce((a, b) => a + b, 0);
        setStatus('success');
        setMessage(`Imported ${total} records successfully`);
        // Reseed variety configs if needed
        await seedDatabase();
        // Reload the page to refresh stores
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleClearData = async () => {
    setStatus('loading');
    try {
      await clearAllData();
      await seedDatabase();
      setStatus('success');
      setMessage('All data cleared');
      setShowClearConfirm(false);
      // Reload to refresh stores
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message);
    }
  };

  const handleViewDebug = async () => {
    if (showDebug) {
      setShowDebug(false);
      setDebugData('');
      return;
    }

    setStatus('loading');
    try {
      const [stats, data] = await Promise.all([getDatabaseStats(), getRawData()]);
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
        {/* Export All Data (Unified) */}
        <button
          type="button"
          onClick={handleExportUnified}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <div className="font-medium text-green-700 dark:text-green-300">
            💾 Export All Data
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            Complete backup of Microgreens + Propagation modules (recommended)
          </div>
        </button>

        {/* Export JSON */}
        <button
          type="button"
          onClick={handleExportJSON}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            📤 Export Microgreens Data
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Download Microgreens module data as JSON backup
          </div>
        </button>

        {/* Import JSON */}
        <button
          type="button"
          onClick={handleImportClick}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            📥 Import Data
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Restore from JSON backup
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Export CSV */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            📊 Export CSV
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Export trays as spreadsheet
          </div>
        </button>

        {/* Debug Mode */}
        <button
          type="button"
          onClick={handleViewDebug}
          disabled={status === 'loading'}
          className="w-full text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <div className="font-medium text-slate-900 dark:text-white">
            🔍 {showDebug ? 'Hide' : 'View'} Raw Data
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

        {!showClearConfirm ? (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="w-full p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="font-medium">🗑️ Clear All Data</div>
            <div className="text-sm opacity-75">
              Permanently delete all tracked data
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
            <p className="text-red-700 dark:text-red-300 font-medium mb-3">
              Are you sure? This cannot be undone!
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClearData}
                disabled={status === 'loading'}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Yes, Delete Everything
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
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
