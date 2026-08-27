/**
 * Paddock - Local-first small farm management platform
 *
 * Main application component that initializes the database
 * and renders the router.
 */

import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { seedDatabase } from '@/lib/db';
import { registerPaddockTools } from '@/lib/webmcp';
import { useTheme } from '@/hooks';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  // Initialize theme on app startup - this applies the saved preference
  // before any UI renders, preventing flash of wrong theme
  const { isLoading: isThemeLoading } = useTheme();

  useEffect(() => {
    // Initialize database on app start
    async function init() {
      await seedDatabase();
      setIsReady(true);

      // Expose growing tools to any browser AI agent. Registered after seeding so the
      // agent never sees an empty database, and awaited separately so a WebMCP failure
      // can never block the app from rendering.
      void registerPaddockTools();
    }
    init();
  }, []);

  // Wait for both database and theme to be ready
  if (!isReady || isThemeLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-pulse">🌱</div>
          <p className="text-slate-600 dark:text-slate-400 mt-4">
            Starting Paddock...
          </p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
