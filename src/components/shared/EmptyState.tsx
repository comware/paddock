/**
 * EmptyState - Reusable empty state component
 *
 * Shows a friendly message when lists are empty with an optional action button.
 *
 * The action is styled `btn btn-primary`. Those class names were used here and in seven
 * other files but were defined nowhere, so this button rendered as a line of plain text.
 * They are now defined in index.css alongside `.card`. See the test in
 * __tests__/buttonClasses.test.ts, which fails if they go missing again.
 */

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-4 opacity-60">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
