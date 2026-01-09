/**
 * Sentry Error Monitoring Configuration
 *
 * Initializes Sentry for production error tracking.
 * Only active in production builds to avoid noise in development.
 */

import * as Sentry from '@sentry/react';

// Only initialize Sentry in production
const isDevelopment = import.meta.env.DEV;
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  // Skip initialization in development or if DSN not configured
  if (isDevelopment || !sentryDsn) {
    console.log('[Sentry] Skipping initialization (development mode or DSN not configured)');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust this value in production to reduce data volume
    tracesSampleRate: 0.1, // 10% of transactions

    // Capture Replay for user sessions - useful for debugging UI issues
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask user input
        blockAllMedia: true, // Privacy: don't capture media
      }),
    ],

    // Filter out errors we don't care about
    beforeSend(event, hint) {
      // Don't send events for local development
      if (window.location.hostname === 'localhost') {
        return null;
      }

      const error = hint.originalException;

      // Filter out network errors that are expected (offline usage)
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
          return null;
        }
      }

      return event;
    },
  });

  console.log('[Sentry] Initialized for production monitoring');
}

/**
 * Manually capture an exception (useful for caught errors you want to track)
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!isDevelopment && sentryDsn) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('[Sentry] Would capture:', error, context);
  }
}

/**
 * Set user context for Sentry (useful for associating errors with users)
 */
export function setUser(id: string, email?: string) {
  if (!isDevelopment && sentryDsn) {
    Sentry.setUser({ id, email });
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (!isDevelopment && sentryDsn) {
    Sentry.setUser(null);
  }
}
