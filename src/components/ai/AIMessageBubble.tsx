/**
 * AIMessageBubble - Chat message display component with action buttons
 *
 * Renders user and assistant messages with markdown support,
 * hover actions for editing and deleting messages.
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/lib/ai';

/**
 * BouncingDots - Loading indicator with animated dots
 */
export function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isExpanded?: boolean;
}

export function MessageBubble({ message, isStreaming, onEdit, onDelete, isExpanded }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`relative ${isExpanded ? 'max-w-3xl' : ''}`}>
        <div
          className={`rounded-xl px-3 py-2 ${
            isExpanded ? 'max-w-none' : 'max-w-[85%]'
          } ${
            isUser
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-code:text-primary-600 dark:prose-code:text-primary-400 prose-code:before:content-none prose-code:after:content-none max-w-none break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse rounded-sm" />
          )}
        </div>

        {/* Action buttons for messages */}
        {showActions && (onEdit || onDelete) && (
          <div className={`absolute ${isUser ? '-left-16' : '-right-16'} top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
            {isUser && onEdit && (
              <button
                onClick={onEdit}
                className="p-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
                title="Edit message (regenerates response)"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-red-500 hover:text-white"
                title="Delete message and all after"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
