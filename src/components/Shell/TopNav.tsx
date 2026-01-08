/**
 * TopNav - Platform-level module navigation
 *
 * Displays the Paddock logo and module switcher tabs.
 * Highlights the currently active module.
 */

import { NavLink } from 'react-router-dom';

interface Module {
  name: string;
  path: string;
  icon: string;
  enabled: boolean;
}

const modules: Module[] = [
  { name: 'Grow', path: '/grow', icon: '🌱', enabled: true },
  { name: 'Sales', path: '/sales', icon: '💰', enabled: false },
  { name: 'Markets', path: '/markets', icon: '🏪', enabled: false },
  { name: 'CRM', path: '/crm', icon: '👥', enabled: false },
  { name: 'Finance', path: '/finance', icon: '📊', enabled: false },
  { name: 'Planner', path: '/planner', icon: '📅', enabled: false },
];

export function TopNav() {
  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-bold text-xl text-slate-900 dark:text-white">
            Paddock
          </span>
        </div>

        {/* Module tabs - hidden on mobile, shown on sm and up */}
        <div className="hidden sm:flex items-center gap-1">
          {modules.map((module) => (
            <NavLink
              key={module.path}
              to={module.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !module.enabled
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed pointer-events-none'
                    : isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
              onClick={(e) => !module.enabled && e.preventDefault()}
            >
              <span className="mr-1">{module.icon}</span>
              {module.name}
            </NavLink>
          ))}
        </div>

        {/* Secondary navigation - hidden on mobile (in BottomNav) */}
        <div className="hidden sm:flex items-center gap-2">
          <NavLink
            to="/grow/guides"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Guides
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-200 dark:bg-slate-700'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`
            }
          >
            <span className="text-xl">⚙️</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
