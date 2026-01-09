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

// Lazy load AI assistant - it's a floating widget that can wait
const AIAssistant = lazy(() => import('@/components/ai/AIAssistant').then(m => ({ default: m.AIAssistant })));

export function AppShell() {
  const { showHelp, setShowHelp, shortcuts } = useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <TopNav />
      <main className="flex-1 flex flex-col pb-16 sm:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      <Suspense fallback={null}>
        <AIAssistant />
      </Suspense>
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />
    </div>
  );
}
