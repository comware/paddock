/**
 * StatCard - one number, at the top of a module's dashboard.
 *
 * Each module had grown its own. Microgreens put a line icon above the figure; propagation
 * put an emoji beside the label and the figure underneath. Same information, two shapes, so
 * moving between modules meant re-reading the layout rather than reading the number.
 *
 * This is the microgreens shape, because the figure is what a grower is scanning for and it
 * should be the first thing the eye lands on - not the label. The icon is decorative and
 * sits above at low contrast; it labels the card, it does not compete with the value.
 *
 * Icons are Lucide components rather than emoji: emoji render differently per platform, sit
 * on an inconsistent baseline, and cannot take a colour. Every one of these is aria-hidden -
 * the label beside it is the accessible name.
 */

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  Icon: LucideIcon;
  /** The figure itself. Pre-formatted, including any unit or "--" for no data. */
  value: string | number;
  label: string;
  /** Optional qualifier - what the figure counts, or over what period. */
  subValue?: string;
  /** Placed on the figure, so a test can assert the number without matching on layout. */
  testId?: string;
}

export function StatCard({ Icon, value, label, subValue, testId }: StatCardProps) {
  return (
    <div className="card p-4 border border-slate-200 dark:border-slate-700">
      <Icon
        aria-hidden="true"
        className="w-5 h-5 mb-2 text-slate-400 dark:text-slate-500"
        strokeWidth={1.75}
      />
      <div className="stat-figure text-3xl text-slate-900 dark:text-white" data-testid={testId}>
        {value}
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
      {subValue && (
        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subValue}</div>
      )}
    </div>
  );
}

/** Lays out a row of StatCards. Two up on a phone, four across from tablet width. */
export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>;
}
