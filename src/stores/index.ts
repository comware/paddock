/**
 * Stores - Central exports for error handling utilities
 *
 * This module provides error handling utilities for Zustand stores.
 */

export {
  withErrorHandling,
  withSyncErrorHandling,
  wrapAsync,
  wrapSync,
  handleStoreError,
  isRecoverableError,
  setGlobalErrorHandler,
  clearGlobalErrorHandler,
  type StoreError,
} from './errorMiddleware';
