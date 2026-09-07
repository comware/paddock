/**
 * PageHeader - the title block every page starts with.
 *
 * Each page used to lay out its own, which is why an audit found six pages with no <h1> at
 * all, three with two of them, and inconsistent spacing above the first card between
 * modules. Those look like separate bugs and are really one: nothing owned the decision, so
 * every page made it again.
 *
 * Taking the title as a required prop is the point. A page cannot render this and forget to
 * say what it is.
 */

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** One line under the title. What this page is for, when that is not obvious. */
  description?: string;
  /** The page's primary action, sitting opposite the title. */
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {description && (
          <p className="text-slate-600 dark:text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
