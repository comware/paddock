import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureException, getStoredErrors, clearStoredErrors } from '../local-error-tracker';

describe('local-error-tracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('captureException', () => {
    it('stores an error in localStorage', () => {
      captureException(new Error('test error'), { type: 'test' });
      const errors = getStoredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('test error');
    });

    it('includes context in stored error', () => {
      captureException(new Error('ctx error'), { custom: 'data' });
      const errors = getStoredErrors();
      expect(errors[0].context).toMatchObject({ custom: 'data' });
    });

    it('stores errors in LIFO order', () => {
      captureException(new Error('first'));
      captureException(new Error('second'));
      const errors = getStoredErrors();
      expect(errors[0].message).toBe('second');
      expect(errors[1].message).toBe('first');
    });

    it('includes url and userAgent', () => {
      captureException(new Error('ua test'));
      const errors = getStoredErrors();
      expect(errors[0].url).toBeTruthy();
      expect(errors[0].userAgent).toBeTruthy();
    });

    it('generates unique IDs for each error', () => {
      captureException(new Error('a'));
      captureException(new Error('b'));
      const errors = getStoredErrors();
      expect(errors[0].id).not.toBe(errors[1].id);
    });
  });

  describe('getStoredErrors', () => {
    it('returns empty array when no errors stored', () => {
      expect(getStoredErrors()).toEqual([]);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('paddock_error_log', 'not json');
      expect(getStoredErrors()).toEqual([]);
    });
  });

  describe('clearErrors', () => {
    it('removes all stored errors', () => {
      captureException(new Error('to clear'));
      expect(getStoredErrors().length).toBe(1);
      clearStoredErrors();
      expect(getStoredErrors()).toEqual([]);
    });
  });
});
