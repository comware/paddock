/**
 * EmptyState - what a screen shows when it has nothing on it yet.
 *
 * Twenty-odd screens hand-rolled this: a large glyph, a heading, a line of explanation, and
 * usually a button. Same shape every time, written out fresh every time, and drifting - the
 * glyph was text-4xl on some and text-6xl on others, the panel had a shadow on some and none
 * on others, and several had lost their icon entirely.
 *
 * Propagation's batch list rendered the literal string `:seedling:`, mother plants rendered
 * `:herb:`, and the station and supply lists both had `{hasFilters ? '?' : '?'}` - a ternary
 * whose two branches are the same bare question mark. Emoji that did not survive some
 * copy or encoding step, in the one place a new grower is guaranteed to look.
 *
 * Icons are Lucide rather than emoji for the same reason as everywhere else: they render
 * identically on every platform, take the surrounding colour, and cannot silently decay into
 * a question mark.
 */

import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  /** The thing to do next. Rendered as the filled primary button. */
  action?: EmptyStateAction;
  /** An alternative, for screens that offer two ways forward. Rendered quieter. */
  secondaryAction?: EmptyStateAction;
}

export function EmptyState({
  Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon
        aria-hidden="true"
        className="w-12 h-12 mb-4 text-slate-400 dark:text-slate-500"
        strokeWidth={1.5}
      />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <button onClick={action.onClick} className="btn btn-primary">
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn btn-secondary">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
