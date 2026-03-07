/**
 * AIChatView - Chat messages area and input form
 *
 * Renders the model selector, message list, streaming indicators,
 * and the input form for sending messages.
 */

import { useRef, useEffect, type FormEvent, type RefObject } from 'react';
import type { ChatMessage } from '@/lib/ai';
import { MessageBubble, BouncingDots } from './AIMessageBubble';

interface AIChatViewProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  isExpanded: boolean;
  // Model selector
  noModels: boolean;
  modelsLoading: boolean;
  models: Array<{ id: string; name: string }>;
  selectedModel: string | null;
  onSelectModel: (id: string) => void;
  onCloseAndNavigate: () => void;
  // Input
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  editingMessageIndex: number | null;
  // Message actions
  onEditMessage: (index: number) => void;
  onDeleteMessage: (index: number) => void;
}

export function AIChatView({
  messages,
  isStreaming,
  streamingContent,
  error,
  isExpanded,
  noModels,
  modelsLoading,
  models,
  selectedModel,
  onSelectModel,
  onCloseAndNavigate,
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  inputRef,
  editingMessageIndex,
  onEditMessage,
  onDeleteMessage,
}: AIChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <>
      {/* Model selector or setup prompt */}
      {noModels ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            No AI providers configured yet.
          </p>
          <button
            onClick={onCloseAndNavigate}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            Add API key in Settings →
          </button>
        </div>
      ) : (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
          <select
            value={selectedModel || ''}
            onChange={(e) => onSelectModel(e.target.value)}
            className="w-full text-sm px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500"
            disabled={modelsLoading}
          >
            {modelsLoading ? (
              <option>Loading models...</option>
            ) : (
              models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Messages area */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          isExpanded ? 'min-h-0' : 'min-h-[200px] max-h-[40vh]'
        }`}
      >
        {messages.length === 0 && !streamingContent && (
          <div className="text-center py-8">
            <span className="text-4xl mb-2 block">🌱</span>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Ask me anything about microgreens growing, farm management, or using Paddock!
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            onEdit={
              message.role === 'user' && !isStreaming
                ? () => onEditMessage(index)
                : undefined
            }
            onDelete={!isStreaming ? () => onDeleteMessage(index) : undefined}
            isExpanded={isExpanded}
          />
        ))}

        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3">
              <BouncingDots />
            </div>
          </div>
        )}

        {streamingContent && (
          <MessageBubble
            message={{
              role: 'assistant',
              content: streamingContent,
            }}
            isStreaming
            isExpanded={isExpanded}
          />
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={onSubmit} className="p-3 border-t border-slate-200 dark:border-slate-700">
        {editingMessageIndex !== null && (
          <div className="flex items-center gap-2 mb-2 text-xs text-amber-600 dark:text-amber-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Editing message - press Esc to cancel</span>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={noModels ? 'Configure AI in Settings first' : 'Ask a question...'}
            disabled={noModels || isStreaming}
            rows={1}
            className={`flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              editingMessageIndex !== null
                ? 'border-amber-400 focus:ring-amber-500'
                : 'border-slate-300 dark:border-slate-600 focus:ring-primary-500'
            }`}
          />
          <button
            type="submit"
            disabled={noModels || !input.trim() || isStreaming}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <BouncingDots />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
