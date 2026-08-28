/**
 * ModuleSettings - choose which parts of Paddock to show
 *
 * Most growers use one or two modules. Turning the rest off keeps the navigation to the
 * job actually being done.
 *
 * Disabling a module hides it; it does not delete anything. Turning it back on brings the
 * data back exactly as it was, which is worth saying on the screen so nobody hesitates
 * over the switch.
 */

import { useEffect } from 'react';
import { useModulesStore, MODULE_DEFINITIONS } from '@/stores/useModulesStore';

export function ModuleSettings() {
  const { enabled, isLoaded, load, setEnabled } = useModulesStore();

  useEffect(() => {
    if (!isLoaded) void load();
  }, [isLoaded, load]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Modules</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Show only the parts of Paddock you use. Turning one off hides it — nothing is
          deleted, and switching it back on restores everything.
        </p>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
        {MODULE_DEFINITIONS.map((module) => {
          const on = enabled.includes(module.id);
          const inputId = `module-${module.id}`;

          return (
            <li key={module.id} className="flex items-center gap-3 px-4 py-3">
              <module.Icon
                aria-hidden="true"
                className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0"
                strokeWidth={1.75}
              />

              <div className="flex-1 min-w-0">
                <label
                  htmlFor={inputId}
                  className="text-sm font-medium text-slate-900 dark:text-white cursor-pointer"
                >
                  {module.name}
                  {module.required && (
                    <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                      always on
                    </span>
                  )}
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {module.description}
                </p>
              </div>

              {/* A plain checkbox styled as a switch: keyboard and screen reader
                  behaviour comes for free, and the label is properly associated. */}
              <input
                id={inputId}
                type="checkbox"
                checked={on}
                disabled={module.required}
                onChange={(e) => void setEnabled(module.id, e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
