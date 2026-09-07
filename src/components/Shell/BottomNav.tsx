/**
 * BottomNav - module switcher on small screens.
 *
 * This was six hard-coded microgreens links - Dashboard, Trays, Daily, Analytics, Guides,
 * Settings - all pointing under /microgreens no matter which module you were in. It predates
 * the split into three enterprises and was never revisited.
 *
 * The consequence was worse than untidy. The top nav's module switcher is `hidden sm:flex`,
 * so on a phone it is not rendered at all, and this bar was the only thing in its place. With
 * every link pointing at microgreens, Propagation and Vegetables were unreachable on a phone
 * except by typing the URL.
 *
 * So this is now the module switcher: the same thing the top nav shows on a wider screen,
 * from the same MODULE_DEFINITIONS and the same enabled list, so a module the grower has
 * turned off does not appear here either. Navigation *within* a module is ModuleNav's job,
 * which renders on mobile too and scrolls sideways when it needs to.
 */

import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useModulesStore, MODULE_DEFINITIONS } from '@/stores/useModulesStore';

export function BottomNav() {
  const location = useLocation();
  const { enabled, isLoaded, load } = useModulesStore();

  useEffect(() => {
    if (!isLoaded) void load();
  }, [isLoaded, load]);

  const modules = MODULE_DEFINITIONS.filter((m) => enabled.includes(m.id));

  // A module is current for anything beneath it, so /microgreens/site/1/trays still lights
  // Microgreens.
  const isCurrentModule = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const linkClass = (active: boolean) =>
    `flex flex-col items-center justify-center w-full h-full py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg ${
      active
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-slate-500 dark:text-slate-400'
    }`;

  return (
    <nav
      aria-label="Modules"
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 sm:hidden safe-bottom z-40"
    >
      <div className="flex items-center justify-around h-16">
        {modules.map((module) => (
          <NavLink
            key={module.id}
            to={module.path}
            className={linkClass(isCurrentModule(module.path))}
          >
            <module.Icon aria-hidden="true" className="w-6 h-6" strokeWidth={1.75} />
            <span className="text-[10px] mt-0.5 font-medium">{module.name}</span>
          </NavLink>
        ))}
        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)}>
          <Settings aria-hidden="true" className="w-6 h-6" strokeWidth={1.75} />
          <span className="text-[10px] mt-0.5 font-medium">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
