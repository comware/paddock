/**
 * ComingSoon - placeholder for a module that is switched on but not built.
 *
 * Reachable in earnest: Settings lists Sales, Markets, CRM and Finance as modules a grower
 * can enable, and enabling one puts it in the top nav. So this is a real destination, and it
 * used to behave like a dead end - a construction-sign emoji, an <h2> where every other page
 * has an <h1>, and no way back except the browser button.
 */

import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';

interface ComingSoonProps {
  module: string;
}

export function ComingSoon({ module }: ComingSoonProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <Hammer
          aria-hidden="true"
          className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
        />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{module}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This module is not built yet. You can turn it off again in Settings if you would
          rather not see it in the menu.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/microgreens" className="btn btn-primary">
            Back to Microgreens
          </Link>
          <Link to="/settings" className="btn btn-secondary">
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
