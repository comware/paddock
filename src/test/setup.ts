/**
 * Test Setup - Global configuration for Vitest
 *
 * This file runs before each test file, setting up:
 * - Testing Library matchers
 * - IndexedDB mock for Dexie
 * - Browser API mocks
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (used by many UI components)
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (used for lazy loading)
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock scrollIntoView (used by message scroll)
Element.prototype.scrollIntoView = vi.fn();

// Provide localStorage/sessionStorage.
//
// happy-dom stopped exposing Web Storage on window/globalThis (absent as of 20.8.9), so
// anything using it - the local error tracker, theme persistence - throws on access
// under test. Node's experimental localStorage needs --localstorage-file and is not
// per-test isolated, so we supply a plain in-memory implementation instead.
//
// Only installed when genuinely missing, so a future happy-dom that restores Web Storage
// takes precedence automatically.
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    key(index: number): string | null {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string): string | null {
      return store.get(String(key)) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(String(key), String(value));
    },
    removeItem(key: string): void {
      store.delete(String(key));
    },
    clear(): void {
      store = new Map();
    },
  } as Storage;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!globalThis[name]) {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, name, {
      value: storage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, name, {
      value: storage,
      writable: true,
      configurable: true,
    });
  }
}

// Suppress console errors/warnings in tests unless explicitly needed
// Uncomment to enable quiet tests:
// vi.spyOn(console, 'error').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
