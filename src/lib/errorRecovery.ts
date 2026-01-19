/**
 * Error Recovery Utilities
 *
 * Functions for recovering from various error scenarios:
 * - IndexedDB corruption detection and recovery
 * - Store reset capabilities
 * - Network retry with exponential backoff
 * - Data export for recovery
 */

import { captureException, getStoredErrors, clearStoredErrors, exportErrorLog } from './monitoring/sentry';

// ============================================
// TYPES
// ============================================

export interface RecoveryResult {
  success: boolean;
  message: string;
  action?: 'retry' | 'reset' | 'export' | 'reload';
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

// ============================================
// INDEXEDDB RECOVERY
// ============================================

/**
 * Check if IndexedDB is available and working
 */
export async function checkIndexedDBHealth(): Promise<{
  available: boolean;
  hasQuotaIssues: boolean;
  error?: string;
}> {
  try {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      return { available: false, hasQuotaIssues: false, error: 'IndexedDB not supported' };
    }

    // Try to open a test database
    const testDbName = '__paddock_health_check__';
    const request = indexedDB.open(testDbName, 1);

    return new Promise((resolve) => {
      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        const isQuotaError = Boolean(
          error?.name === 'QuotaExceededError' ||
          error?.message?.includes('quota')
        );

        resolve({
          available: false,
          hasQuotaIssues: isQuotaError,
          error: error?.message || 'Failed to open database',
        });
      };

      request.onsuccess = () => {
        // Clean up test database
        request.result.close();
        indexedDB.deleteDatabase(testDbName);
        resolve({ available: true, hasQuotaIssues: false });
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore('test');
      };
    });
  } catch (error) {
    return {
      available: false,
      hasQuotaIssues: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Attempt to recover from IndexedDB issues
 */
export async function attemptIndexedDBRecovery(): Promise<RecoveryResult> {
  const health = await checkIndexedDBHealth();

  if (health.available) {
    return { success: true, message: 'Database is healthy', action: 'retry' };
  }

  if (health.hasQuotaIssues) {
    // Suggest clearing some storage
    return {
      success: false,
      message: 'Storage quota exceeded. Consider clearing browser data or exporting and deleting old records.',
      action: 'export',
    };
  }

  // Generic recovery: suggest reload
  return {
    success: false,
    message: 'Database unavailable. Try reloading the page.',
    action: 'reload',
  };
}

// ============================================
// RETRY UTILITIES
// ============================================

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      onRetry?.(attempt, lastError);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================
// STORE RECOVERY
// ============================================

/**
 * Reset all Zustand stores to initial state
 * This is a nuclear option for when stores are corrupted
 */
export async function resetAllStores(): Promise<RecoveryResult> {
  try {
    // Clear localStorage Zustand persistence (if any)
    const zustandKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('paddock-') || key.startsWith('zustand-')
    );

    zustandKeys.forEach((key) => localStorage.removeItem(key));

    return {
      success: true,
      message: 'Store state cleared. Reload to reinitialize.',
      action: 'reload',
    };
  } catch (error) {
    captureException(error as Error, { context: 'resetAllStores' });
    return {
      success: false,
      message: 'Failed to reset stores: ' + (error as Error).message,
    };
  }
}

/**
 * Clear specific module's store data
 */
export function clearModuleStore(module: 'grow' | 'propagation' | 'planner'): void {
  const keysToRemove = Object.keys(localStorage).filter((key) =>
    key.includes(module)
  );
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// ============================================
// DATA EXPORT FOR RECOVERY
// ============================================

/**
 * Export all critical data to JSON for backup before recovery
 */
export async function exportDataForRecovery(): Promise<string> {
  const exportData: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    errors: getStoredErrors(),
  };

  // Try to export from each Dexie database
  try {
    const { growDb, propDb, platformDb } = await import('./db');

    exportData.grow = {
      sites: await growDb.sites.toArray().catch(() => []),
      trays: await growDb.trays.toArray().catch(() => []),
      observations: await growDb.observations.toArray().catch(() => []),
      timeEntries: await growDb.timeEntries.toArray().catch(() => []),
      varieties: await growDb.varietyConfigs.toArray().catch(() => []),
      mediums: await growDb.mediumConfigs.toArray().catch(() => []),
    };

    exportData.propagation = {
      batches: await propDb.batches.toArray().catch(() => []),
      motherPlants: await propDb.motherPlants.toArray().catch(() => []),
      stations: await propDb.stations.toArray().catch(() => []),
      supplies: await propDb.supplies.toArray().catch(() => []),
      speciesConfigs: await propDb.speciesConfigs.toArray().catch(() => []),
    };

    exportData.platform = {
      settings: await platformDb.settings.toArray().catch(() => []),
    };
  } catch (error) {
    exportData.exportError = (error as Error).message;
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download data export as a file
 */
export async function downloadDataExport(): Promise<void> {
  const data = await exportDataForRecovery();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paddock-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// ERROR ANALYSIS
// ============================================

/**
 * Analyze recent errors to suggest recovery actions
 */
export function analyzeErrorPattern(): {
  hasRepeatingErrors: boolean;
  suggestedAction: 'retry' | 'reset' | 'export' | 'reload' | 'none';
  confidence: 'low' | 'medium' | 'high';
} {
  const errors = getStoredErrors();

  if (errors.length === 0) {
    return { hasRepeatingErrors: false, suggestedAction: 'none', confidence: 'high' };
  }

  // Check for repeating errors (same message within last 5 minutes)
  const recentErrors = errors.filter((e) => {
    const errorTime = new Date(e.timestamp).getTime();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return errorTime > fiveMinutesAgo;
  });

  const messageCount = new Map<string, number>();
  recentErrors.forEach((e) => {
    const count = messageCount.get(e.message) || 0;
    messageCount.set(e.message, count + 1);
  });

  const hasRepeatingErrors = Array.from(messageCount.values()).some((count) => count >= 3);

  // Check for IndexedDB errors
  const hasDbErrors = recentErrors.some((e) =>
    e.message.toLowerCase().includes('indexeddb') ||
    e.message.toLowerCase().includes('dexie') ||
    e.message.toLowerCase().includes('database')
  );

  if (hasDbErrors && hasRepeatingErrors) {
    return { hasRepeatingErrors: true, suggestedAction: 'export', confidence: 'high' };
  }

  if (hasRepeatingErrors) {
    return { hasRepeatingErrors: true, suggestedAction: 'reload', confidence: 'medium' };
  }

  return { hasRepeatingErrors: false, suggestedAction: 'retry', confidence: 'high' };
}

/**
 * Clear error history after successful recovery
 */
export function clearErrorHistory(): void {
  clearStoredErrors();
}

/**
 * Get error report for support
 */
export function getErrorReport(): string {
  return exportErrorLog();
}
