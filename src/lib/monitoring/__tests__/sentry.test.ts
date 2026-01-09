/**
 * Local error tracking tests
 *
 * Tests for the localStorage-based error tracking system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  initSentry,
  captureException,
  setUser,
  clearUser,
  getStoredErrors,
  clearStoredErrors,
  exportErrorLog,
} from '../sentry';

const STORAGE_KEY = 'paddock_error_log';

describe('Local Error Tracking', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.removeItem(STORAGE_KEY);
    // Reset user context
    clearUser();
    // Mock crypto.randomUUID with valid UUID format
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000001' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exports', () => {
    it('should export expected functions', async () => {
      const sentry = await import('../sentry');

      expect(sentry.initSentry).toBeDefined();
      expect(sentry.captureException).toBeDefined();
      expect(sentry.setUser).toBeDefined();
      expect(sentry.clearUser).toBeDefined();
      expect(sentry.getStoredErrors).toBeDefined();
      expect(sentry.clearStoredErrors).toBeDefined();
      expect(sentry.exportErrorLog).toBeDefined();
    });
  });

  describe('captureException', () => {
    it('should store error in localStorage', () => {
      const error = new Error('Test error');
      captureException(error);

      const stored = getStoredErrors();
      expect(stored).toHaveLength(1);
      expect(stored[0].message).toBe('Test error');
      expect(stored[0].id).toBe('00000000-0000-0000-0000-000000000001');
    });

    it('should include context in stored error', () => {
      const error = new Error('Test error');
      captureException(error, { section: 'dashboard', action: 'load' });

      const stored = getStoredErrors();
      expect(stored[0].context).toMatchObject({
        section: 'dashboard',
        action: 'load',
      });
    });

    it('should include user context when set', () => {
      setUser('user-123', 'test@example.com');
      const error = new Error('Test error');
      captureException(error);

      const stored = getStoredErrors();
      expect(stored[0].context?.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should limit stored errors to 50', () => {
      // Generate 60 errors
      for (let i = 0; i < 60; i++) {
        vi.spyOn(crypto, 'randomUUID').mockReturnValue(`00000000-0000-0000-0000-${String(i).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`);
        captureException(new Error(`Error ${i}`));
      }

      const stored = getStoredErrors();
      expect(stored).toHaveLength(50);
      // Most recent should be first
      expect(stored[0].message).toBe('Error 59');
    });

    it('should store errors in reverse chronological order', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('00000000-0000-0000-0000-000000000001' as `${string}-${string}-${string}-${string}-${string}`);
      captureException(new Error('First error'));

      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
      captureException(new Error('Second error'));

      const stored = getStoredErrors();
      expect(stored[0].message).toBe('Second error');
      expect(stored[1].message).toBe('First error');
    });
  });

  describe('getStoredErrors', () => {
    it('should return empty array when no errors stored', () => {
      expect(getStoredErrors()).toEqual([]);
    });

    it('should return empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      expect(getStoredErrors()).toEqual([]);
    });
  });

  describe('clearStoredErrors', () => {
    it('should remove all stored errors', () => {
      captureException(new Error('Test error'));
      expect(getStoredErrors()).toHaveLength(1);

      clearStoredErrors();
      expect(getStoredErrors()).toEqual([]);
    });
  });

  describe('exportErrorLog', () => {
    it('should return JSON string of errors', () => {
      captureException(new Error('Test error'));

      const exported = exportErrorLog();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Test error');
    });

    it('should return formatted JSON', () => {
      captureException(new Error('Test error'));

      const exported = exportErrorLog();
      // Should contain newlines (formatted)
      expect(exported).toContain('\n');
    });
  });

  describe('user context', () => {
    it('should set and clear user context', () => {
      setUser('user-123', 'test@example.com');
      captureException(new Error('With user'));

      clearUser();
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
      captureException(new Error('Without user'));

      const stored = getStoredErrors();
      expect(stored[0].context?.user).toBeUndefined();
      expect(stored[1].context?.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('initSentry (initErrorTracking)', () => {
    it('should not throw when called', () => {
      expect(() => initSentry()).not.toThrow();
    });

    it('should set up global error handlers', () => {
      initSentry();
      expect(window.onerror).toBeDefined();
      expect(window.onunhandledrejection).toBeDefined();
    });
  });
});
