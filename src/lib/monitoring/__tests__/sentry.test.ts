/**
 * Sentry monitoring tests
 *
 * Note: These tests verify the module structure, not actual
 * Sentry integration (which requires a real DSN and network calls).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Sentry Monitoring', () => {
  beforeEach(() => {
    // Reset environment
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_SENTRY_DSN', '');
  });

  it('should export expected functions', async () => {
    const sentry = await import('../sentry');

    expect(sentry.initSentry).toBeDefined();
    expect(sentry.captureException).toBeDefined();
    expect(sentry.setUser).toBeDefined();
    expect(sentry.clearUser).toBeDefined();
  });

  it('should not throw when calling functions without DSN', async () => {
    const sentry = await import('../sentry');

    expect(() => sentry.initSentry()).not.toThrow();
    expect(() => sentry.captureException(new Error('test'))).not.toThrow();
    expect(() => sentry.setUser('123')).not.toThrow();
    expect(() => sentry.clearUser()).not.toThrow();
  });
});
