/**
 * useTheme - Global theme management hook
 *
 * Provides theme state and controls for light/dark/system modes.
 * Reads from platformDb.platformSettings on mount and syncs changes.
 * Applies theme class to document element.
 */

import { useEffect, useState, useCallback } from 'react';
import { platformDb } from '@/lib/db';

export type Theme = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
  isLoading: boolean;
}

/**
 * Applies the appropriate dark class to the document element
 */
function applyTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  const root = document.documentElement;
  const shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark);

  if (shouldBeDark) {
    root.classList.add('dark');
    return 'dark';
  } else {
    root.classList.remove('dark');
    return 'light';
  }
}

/**
 * Global theme hook - manages theme persistence and application
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const setting = await platformDb.settings
          .where('key')
          .equals('theme')
          .first();

        const savedTheme = (setting?.value as Theme) || 'system';
        setThemeState(savedTheme);

        // Apply immediately
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = applyTheme(savedTheme, prefersDark);
        setResolvedTheme(resolved);
      } catch (error) {
        console.error('Failed to load theme:', error);
        // Apply system default
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = applyTheme('system', prefersDark);
        setResolvedTheme(resolved);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const resolved = applyTheme('system', e.matches);
        setResolvedTheme(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme when it changes
  useEffect(() => {
    if (isLoading) return;

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = applyTheme(theme, prefersDark);
    setResolvedTheme(resolved);
  }, [theme, isLoading]);

  // Persist theme changes to database and apply immediately
  const setTheme = useCallback(async (newTheme: Theme) => {
    // Apply theme immediately (don't wait for effect)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = applyTheme(newTheme, prefersDark);

    setThemeState(newTheme);
    setResolvedTheme(resolved);

    try {
      const existing = await platformDb.settings
        .where('key')
        .equals('theme')
        .first();

      if (existing) {
        await platformDb.settings.update(existing.id!, { value: newTheme });
      } else {
        await platformDb.settings.add({ key: 'theme', value: newTheme });
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    isLoading,
  };
}
