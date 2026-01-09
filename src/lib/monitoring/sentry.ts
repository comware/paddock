/**
 * Error Monitoring
 *
 * Re-exports local error tracking functionality.
 * This file maintains API compatibility with previous Sentry integration
 * so existing imports continue to work.
 */

export {
  initErrorTracking as initSentry,
  captureException,
  setUser,
  clearUser,
  getStoredErrors,
  clearStoredErrors,
  exportErrorLog,
} from './local-error-tracker';

export type { ErrorRecord } from './local-error-tracker';
