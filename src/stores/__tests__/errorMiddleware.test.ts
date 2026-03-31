import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isRecoverableError,
  handleStoreError,
  setGlobalErrorHandler,
  clearGlobalErrorHandler,
  wrapAsync,
  wrapSync,
} from '../errorMiddleware';

vi.mock('@/lib/monitoring/sentry', () => ({
  captureException: vi.fn(),
}));

describe('errorMiddleware', () => {
  beforeEach(() => {
    clearGlobalErrorHandler();
  });

  describe('isRecoverableError', () => {
    it('treats network errors as recoverable', () => {
      expect(isRecoverableError(new Error('network error'))).toBe(true);
    });

    it('treats fetch errors as recoverable', () => {
      expect(isRecoverableError(new Error('fetch failed'))).toBe(true);
    });

    it('treats transaction errors as recoverable', () => {
      expect(isRecoverableError(new Error('transaction aborted'))).toBe(true);
    });

    it('treats quota errors as not recoverable', () => {
      expect(isRecoverableError(new Error('quota exceeded'))).toBe(false);
    });

    it('treats storage errors as not recoverable', () => {
      expect(isRecoverableError(new Error('storage full'))).toBe(false);
    });

    it('defaults unknown errors to recoverable', () => {
      expect(isRecoverableError(new Error('something weird'))).toBe(true);
    });
  });

  describe('handleStoreError', () => {
    it('returns a StoreError with correct structure', () => {
      const result = handleStoreError(new Error('test error'), 'testStore', 'testAction');
      expect(result.store).toBe('testStore');
      expect(result.action).toBe('testAction');
      expect(result.message).toBe('test error');
      expect(result.id).toBeTruthy();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('handles non-Error objects', () => {
      const result = handleStoreError('string error', 'testStore', 'testAction');
      expect(result.message).toBe('string error');
    });

    it('notifies global error handler when set', () => {
      const handler = vi.fn();
      setGlobalErrorHandler(handler);
      handleStoreError(new Error('test'), 'store', 'action');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('wrapAsync', () => {
    it('returns the action result on success', async () => {
      const wrapped = wrapAsync('store', 'action', async () => 42);
      const result = await wrapped();
      expect(result).toBe(42);
    });

    it('returns undefined on error', async () => {
      const wrapped = wrapAsync('store', 'action', async () => {
        throw new Error('fail');
      });
      const result = await wrapped();
      expect(result).toBeUndefined();
    });
  });

  describe('wrapSync', () => {
    it('returns the action result on success', () => {
      const wrapped = wrapSync('store', 'action', () => 42);
      expect(wrapped()).toBe(42);
    });

    it('returns undefined on error', () => {
      const wrapped = wrapSync('store', 'action', () => {
        throw new Error('fail');
      });
      expect(wrapped()).toBeUndefined();
    });
  });
});
