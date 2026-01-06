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

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize database on app start
    async function init() {
      await seedDatabase();
      setIsReady(true);
    }
    init();
  }, []);

  if (!isReady) {
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
