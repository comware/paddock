/**
 * Local Error Tracking
 *
 * Self-contained, localStorage-based error tracking solution.
 * Replaces external error monitoring services to keep the app
 * fully self-contained with no external dependencies.
 */

export interface ErrorRecord {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url: string;
  userAgent: string;
}

const STORAGE_KEY = 'paddock_error_log';
const MAX_ERRORS = 50;

let currentUser: { id: string; email?: string } | null = null;

/**
 * Initialize local error tracking with global error handlers
 */
export function initErrorTracking(): void {
  // Catch uncaught errors
  window.onerror = (message, source, line, col, error) => {
    captureException(error || new Error(String(message)), {
      source,
      line,
      col,
      type: 'uncaught'
    });
  };

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    captureException(error, { type: 'unhandledrejection' });
  };

  if (import.meta.env.DEV) {
    console.log('[ErrorTracker] Local error tracking initialized');
  }
}

/**
 * Capture and store an exception
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  const record: ErrorRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    context: {
      ...context,
      ...(currentUser && { user: currentUser }),
    },
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  const errors = getStoredErrors();
  errors.unshift(record);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, MAX_ERRORS)));
  } catch (e) {
    // localStorage might be full or disabled - fail silently
    if (import.meta.env.DEV) console.warn('[ErrorTracker] Failed to store error:', e);
  }

  if (import.meta.env.DEV) {
    console.error('[ErrorTracker] Captured:', error.message, context);
  }
}

/**
 * Get all stored errors
 */
export function getStoredErrors(): ErrorRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all stored errors
 */
export function clearStoredErrors(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export error log as JSON string (for debugging/support)
 */
export function exportErrorLog(): string {
  return JSON.stringify(getStoredErrors(), null, 2);
}

/**
 * Set user context for error tracking
 * (API compatibility with Sentry)
 */
export function setUser(id: string, email?: string): void {
  currentUser = { id, email };
}

/**
 * Clear user context
 * (API compatibility with Sentry)
 */
export function clearUser(): void {
  currentUser = null;
}
