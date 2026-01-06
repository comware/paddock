/**
 * ModuleNav - Sub-navigation within a module
 *
 * Displays the navigation tabs for the current module.
 * Used as a secondary nav below the main content area.
 */

import { NavLink } from 'react-router-dom';

export interface ModuleNavItem {
  name: string;
  path: string;
  icon?: string;
}

interface ModuleNavProps {
  items: ModuleNavItem[];
  basePath: string;
}

export function ModuleNav({ items, basePath }: ModuleNavProps) {
  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto py-2">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={`${basePath}${item.path}`}
              end={item.path === ''}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              {item.icon && <span>{item.icon}</span>}
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
