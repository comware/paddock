/**
 * ToastContainer - Renders active toast notifications
 *
 * Fixed position overlay that displays toast messages.
 * Each toast has role="alert" and aria-live="polite" for screen readers.
 * Includes dismiss button and auto-dismiss support via the toast store.
 */

import { useToastStore, type Toast } from '@/stores/useToastStore';

const TYPE_STYLES: Record<Toast['type'], string> = {
  success:
    'bg-green-600 text-white',
  error:
    'bg-red-600 text-white',
  info:
    'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900',
};

const TYPE_ICONS: Record<Toast['type'], string> = {
  success: '\u2713',
  error: '\u2717',
  info: '\u2139',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 sm:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-up ${TYPE_STYLES[toast.type]}`}
        >
          <span className="text-lg font-bold flex-shrink-0" aria-hidden="true">
            {TYPE_ICONS[toast.type]}
          </span>
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => dismiss(toast.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      ))}
    </div>
  );
}
