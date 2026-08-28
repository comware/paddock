/**
 * ModuleNav - Sub-navigation within a module
 *
 * Displays the navigation tabs for the current module.
 * Used as a secondary nav below the main content area.
 */

import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export interface ModuleNavItem {
  name: string;
  path: string;
  /** Line icon. Preferred over the emoji field, which remains for unconverted modules. */
  Icon?: LucideIcon;
  icon?: string;
  /** Count of items needing attention. Rendered as a badge; 0 or undefined shows nothing. */
  badge?: number;
  /** What the badge means, for screen readers. */
  badgeLabel?: string;
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
              {item.Icon ? (
                <item.Icon aria-hidden="true" className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                item.icon && <span aria-hidden="true">{item.icon}</span>
              )}
              {item.name}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  // Announced politely rather than assertively: something arrived, but it
                  // is not urgent enough to interrupt what the user is doing.
                  aria-live="polite"
                  className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold"
                >
                  {item.badge}
                  <span className="sr-only">
                    {' '}
                    {item.badgeLabel ?? 'awaiting attention'}
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
