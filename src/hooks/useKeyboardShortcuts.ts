/**
 * useKeyboardShortcuts - Global keyboard navigation
 *
 * Provides keyboard shortcuts for power users.
 * Only active when not typing in an input field.
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  label: string;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: ShortcutConfig[] = [
    { key: 'g d', label: 'g d', description: 'Go to Dashboard', action: () => navigate('/microgreens') },
    { key: 'g t', label: 'g t', description: 'Go to Trays', action: () => navigate('/microgreens/trays') },
    { key: 'g l', label: 'g l', description: 'Go to Daily Log', action: () => navigate('/microgreens/daily') },
    { key: 'g m', label: 'g m', description: 'Go to Time Tracking', action: () => navigate('/microgreens/time') },
    { key: 'g a', label: 'g a', description: 'Go to Analytics', action: () => navigate('/microgreens/analytics') },
    { key: 'g s', label: 'g s', description: 'Go to Settings', action: () => navigate('/settings') },
    { key: '?', label: '?', description: 'Show keyboard shortcuts', action: () => setShowHelp(true) },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Close help modal with Escape
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
        return;
      }

      // Handle ? shortcut
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Handle 'g' prefix shortcuts (Gmail-style)
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // Wait for next key
        const handleSecondKey = (e2: KeyboardEvent) => {
          const secondTarget = e2.target as HTMLElement;
          if (
            secondTarget.tagName === 'INPUT' ||
            secondTarget.tagName === 'TEXTAREA' ||
            secondTarget.tagName === 'SELECT'
          ) {
            return;
          }

          const combo = `g ${e2.key}`;
          const shortcut = shortcuts.find((s) => s.key === combo);
          if (shortcut) {
            e2.preventDefault();
            shortcut.action();
          }
          window.removeEventListener('keydown', handleSecondKey);
        };

        // Listen for the second key (timeout after 1 second)
        window.addEventListener('keydown', handleSecondKey);
        setTimeout(() => {
          window.removeEventListener('keydown', handleSecondKey);
        }, 1000);
      }
    },
    [navigate, showHelp, shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
    shortcuts,
    currentPath: location.pathname,
  };
}
