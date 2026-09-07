/**
 * TopNav - Platform-level module navigation
 *
 * Displays the Paddock logo and module switcher tabs.
 * Highlights the currently active module.
 */

import { useEffect } from 'react';
import { Sprout, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useModulesStore, MODULE_DEFINITIONS } from '@/stores/useModulesStore';

export function TopNav() {
  const { enabled, isLoaded, load } = useModulesStore();

  useEffect(() => {
    if (!isLoaded) void load();
  }, [isLoaded, load]);

  // Only what the grower has turned on. Modules they will never use were previously
  // rendered greyed out and permanently unclickable, which made the app look larger and
  // more complicated than the job in front of them.
  const modules = MODULE_DEFINITIONS.filter((m) => enabled.includes(m.id));

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sprout
            aria-hidden="true"
            className="w-6 h-6 text-primary-600 dark:text-primary-400"
            strokeWidth={1.75}
          />
          {/* The wordmark leans harder on Fraunces than body headings do: more softness,
              a larger optical size, and the WONK axis on, which is where the typeface's
              character actually lives. */}
          <span
            className="text-2xl text-slate-900 dark:text-white"
            style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: "'SOFT' 60, 'WONK' 1, 'opsz' 96",
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
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
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <module.Icon
                aria-hidden="true"
                className="w-4 h-4 mr-1.5 inline-block align-[-0.2em]"
                strokeWidth={1.75}
              />
              {module.name}
            </NavLink>
          ))}
        </div>

        {/*
          * Settings only. There used to be a Guides link here too, hard-coded to
          * /microgreens/guides - so from Vegetables or Propagation it took you to the wrong
          * module's guides without saying so. Guides now lives at the end of each module's
          * own bar, where it is always the right module's.
          */}
        <div className="hidden sm:flex items-center gap-2">

          <NavLink
            to="/settings"
            aria-label="Settings"
            className={({ isActive }) =>
              `p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isActive
                  ? 'bg-slate-200 dark:bg-slate-700'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`
            }
          >
            <Settings aria-hidden="true" className="w-5 h-5" strokeWidth={1.75} />
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
