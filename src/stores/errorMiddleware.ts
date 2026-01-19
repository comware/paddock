/**
 * Zustand Error Handling Utilities
 *
 * Provides error handling utilities for Zustand stores.
 * These helpers wrap store actions to catch errors gracefully,
 * log them, and notify users without crashing the app.
 *
 * Usage:
 *   // Wrap async actions
 *   loadData: wrapAsync('useTrays', 'loadData', async () => {
 *     const data = await fetchData();
 *     set({ data });
 *   }),
 *
 *   // Or use the simpler try/catch pattern with handleStoreError
 *   loadData: async () => {
 *     try {
 *       const data = await fetchData();
 *       set({ data });
 *     } catch (error) {
 *       handleStoreError(error, 'useTrays', 'loadData');
 *     }
 *   }
 */

import { captureException } from '@/lib/monitoring/sentry';

// ============================================
// TYPES
// ============================================

export interface StoreError {
  id: string;
  timestamp: Date;
  store: string;
  action: string;
  message: string;
  recoverable: boolean;
}

// ============================================
// ERROR HANDLERS
// ============================================

/** Global error notification callback */
let globalErrorHandler: ((error: StoreError) => void) | null = null;

/**
 * Set a global handler for store errors (e.g., show toast)
 */
export function setGlobalErrorHandler(handler: (error: StoreError) => void): void {
  globalErrorHandler = handler;
}

/**
 * Clear the global error handler
 */
export function clearGlobalErrorHandler(): void {
  globalErrorHandler = null;
}

/**
 * Check if an error is recoverable (retryable)
 */
export function isRecoverableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors are usually recoverable
  if (message.includes('network') || message.includes('fetch')) {
    return true;
  }

  // Some IndexedDB errors are recoverable
  if (message.includes('transaction') || message.includes('timeout')) {
    return true;
  }

  // Quota errors are not immediately recoverable
  if (message.includes('quota') || message.includes('storage')) {
    return false;
  }

  // Default to recoverable
  return true;
}

/**
 * Handle a store error - call this in catch blocks
 */
export function handleStoreError(
  error: unknown,
  storeName: string,
  actionName: string
): StoreError {
  const err = error instanceof Error ? error : new Error(String(error));

  const storeError: StoreError = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    store: storeName,
    action: actionName,
    message: err.message,
    recoverable: isRecoverableError(err),
  };

  // Log to monitoring
  captureException(err, {
    store: storeName,
    action: actionName,
    recoverable: storeError.recoverable,
  });

  // Notify global handler (e.g., toast)
  globalErrorHandler?.(storeError);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${storeName}] Store error in ${actionName}:`, err);
  }

  return storeError;
}

// ============================================
// ACTION WRAPPERS
// ============================================

/**
 * Wrap an async action with error handling
 *
 * Usage:
 *   loadData: wrapAsync('useTrays', 'loadData', async () => {
 *     const data = await fetchData();
 *     set({ data });
 *   }),
 */
export function wrapAsync<T>(
  storeName: string,
  actionName: string,
  action: () => Promise<T>
): () => Promise<T | undefined> {
  return async () => {
    try {
      return await action();
    } catch (error) {
      handleStoreError(error, storeName, actionName);
      return undefined;
    }
  };
}

/**
 * Wrap a sync action with error handling
 */
export function wrapSync<T>(
  storeName: string,
  actionName: string,
  action: () => T
): () => T | undefined {
  return () => {
    try {
      return action();
    } catch (error) {
      handleStoreError(error, storeName, actionName);
      return undefined;
    }
  };
}

/**
 * Create an error-handled version of an async function with arguments
 *
 * Usage:
 *   addTray: withErrorHandling('useTrays', 'addTray', async (trayData) => {
 *     await db.trays.add(trayData);
 *   }),
 */
export function withErrorHandling<TArgs extends unknown[], TResult>(
  storeName: string,
  actionName: string,
  action: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult | undefined> {
  return async (...args: TArgs) => {
    try {
      return await action(...args);
    } catch (error) {
      handleStoreError(error, storeName, actionName);
      return undefined;
    }
  };
}

/**
 * Create a sync error-handled version with arguments
 */
export function withSyncErrorHandling<TArgs extends unknown[], TResult>(
  storeName: string,
  actionName: string,
  action: (...args: TArgs) => TResult
): (...args: TArgs) => TResult | undefined {
  return (...args: TArgs) => {
    try {
      return action(...args);
    } catch (error) {
      handleStoreError(error, storeName, actionName);
      return undefined;
    }
  };
}
