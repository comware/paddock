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

        {/* Settings - hidden on mobile (in BottomNav) */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `hidden sm:block p-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-slate-200 dark:bg-slate-700'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
            }`
          }
        >
          <span className="text-xl">⚙️</span>
        </NavLink>
      </div>
    </nav>
  );
}
