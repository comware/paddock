/**
 * AIChatHeader - Toolbar header for the AI chat panel
 *
 * Contains the title, history toggle, new conversation, clear, expand/collapse,
 * and close buttons.
 */

type View = 'chat' | 'history';

interface AIChatHeaderProps {
  view: View;
  onToggleView: () => void;
  onNewConversation: () => void;
  onClearMessages: () => void;
  showClear: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
}

export function AIChatHeader({
  view,
  onToggleView,
  onNewConversation,
  onClearMessages,
  showClear,
  isExpanded,
  onToggleExpanded,
  onClose,
}: AIChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌱</span>
        <h3 className="font-semibold text-slate-900 dark:text-white">Paddock AI</h3>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleView}
          className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${
            view === 'history' ? 'text-primary-500' : 'text-slate-500 dark:text-slate-400'
          }`}
          title={view === 'chat' ? 'View history' : 'Back to chat'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          onClick={onNewConversation}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          title="New conversation"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {showClear && (
          <button
            onClick={onClearMessages}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        <button
          onClick={onToggleExpanded}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            )}
          </svg>
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
