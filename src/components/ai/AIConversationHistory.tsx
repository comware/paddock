/**
 * AIConversationHistory - List of past AI conversations
 *
 * Displays conversation titles with timestamps, supports selection and deletion.
 */

import type { AIConversation } from '@/lib/db/schema';

export interface ConversationHistoryProps {
  conversations: AIConversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNewConversation: () => void;
  isExpanded?: boolean;
}

export function ConversationHistory({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNewConversation,
  isExpanded,
}: ConversationHistoryProps) {
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <svg
          className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          No conversations yet
        </p>
        <button
          onClick={onNewConversation}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Start a new conversation
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 overflow-y-auto ${
        isExpanded ? 'min-h-0' : 'min-h-[200px] max-h-[50vh]'
      }`}
    >
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => conv.id && onSelect(conv.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && conv.id && onSelect(conv.id)}
          className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer ${
            conv.id === currentId ? 'bg-primary-50 dark:bg-primary-900/20' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {conv.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {conv.messageCount} messages · {formatDate(conv.lastMessageAt)}
              </p>
            </div>
            <button
              onClick={(e) => conv.id && onDelete(conv.id, e)}
              className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
