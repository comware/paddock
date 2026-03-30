/**
 * AppShell - Main layout wrapper for Paddock
 *
 * Provides consistent layout structure with:
 * - TopNav for platform-level navigation (desktop)
 * - BottomNav for mobile navigation
 * - Main content area with Outlet for routes
 * - PWA install prompt
 * - Keyboard shortcuts (press ? for help)
 * - Responsive padding and max-width constraints
 */

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { InstallPrompt } from '@/components/pwa';
import { KeyboardShortcutsHelp } from '@/components/ui';
import { useKeyboardShortcuts } from '@/hooks';
import { ToastContainer } from '@/components/Toast/ToastContainer';

// Lazy load AI assistant - it's a floating widget that can wait
const AIAssistant = lazy(() => import('@/components/ai/AIAssistant').then(m => ({ default: m.AIAssistant })));

export function AppShell() {
  const { showHelp, setShowHelp, shortcuts } = useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <TopNav />
      <main id="main-content" className="flex-1 flex flex-col pb-16 sm:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      <Suspense fallback={null}>
        <AIAssistant />
      </Suspense>
      <ToastContainer />
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
}
