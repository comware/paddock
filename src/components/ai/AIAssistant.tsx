/**
 * AIAssistant - Floating chat widget for AI assistance
 *
 * Provides a floating button in the corner that expands to show
 * a chat interface. Supports multiple LLM providers with streaming,
 * conversation history, and message editing.
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  useAIStore,
  useAvailableModels,
  useConversationsStore,
  type ChatMessage,
} from '@/lib/ai';
import type { AIConversation } from '@/lib/db/schema';

type View = 'chat' | 'history';

export function AIAssistant() {
  const navigate = useNavigate();
  const {
    isOpen,
    toggle,
    setOpen,
    selectedModel,
    setSelectedModel,
    currentConversationId,
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    clearMessages,
    startNewConversation,
    loadConversation,
    editLastUserMessage,
  } = useAIStore();

  const {
    conversations,
    loadConversations,
    deleteConversation,
  } = useConversationsStore();

  const { models, isLoading: modelsLoading } = useAvailableModels();
  const [input, setInput] = useState('');
  const [view, setView] = useState<View>('chat');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations when opening history view
  useEffect(() => {
    if (isOpen && view === 'history') {
      loadConversations();
    }
  }, [isOpen, view, loadConversations]);

  // Auto-select first model if none selected
  useEffect(() => {
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel, setSelectedModel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, view]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming) return;

      const message = input;
      setInput('');

      if (editingMessage !== null) {
        await editLastUserMessage(message);
        setEditingMessage(null);
      } else {
        await sendMessage(message);
      }
    },
    [input, isStreaming, sendMessage, editLastUserMessage, editingMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
      if (e.key === 'Escape' && editingMessage !== null) {
        setEditingMessage(null);
        setInput('');
      }
    },
    [handleSubmit, editingMessage]
  );

  const handleEditLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      setEditingMessage(lastUserMessage.content);
      setInput(lastUserMessage.content);
      inputRef.current?.focus();
    }
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    startNewConversation();
    setView('chat');
  }, [startNewConversation]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      await loadConversation(id);
      setView('chat');
    },
    [loadConversation]
  );

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Delete this conversation?')) {
        await deleteConversation(id);
        if (currentConversationId === id) {
          startNewConversation();
        }
      }
    },
    [deleteConversation, currentConversationId, startNewConversation]
  );

  const noModels = !modelsLoading && models.length === 0;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={toggle}
        className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-slate-700 dark:bg-slate-600 rotate-0'
            : 'bg-primary-500 hover:bg-primary-600 hover:scale-105'
        }`}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-36 sm:bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <h3 className="font-semibold text-slate-900 dark:text-white">Paddock AI</h3>
            </div>
            <div className="flex items-center gap-1">
              {/* History toggle */}
              <button
                onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
                className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${
                  view === 'history'
                    ? 'text-primary-500'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title={view === 'chat' ? 'View history' : 'Back to chat'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* New conversation */}
              <button
                onClick={handleNewConversation}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                title="New conversation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {/* Clear current */}
              {messages.length > 0 && view === 'chat' && (
                <button
                  onClick={clearMessages}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  title="Clear chat"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {view === 'history' ? (
            <ConversationHistory
              conversations={conversations}
              currentId={currentConversationId}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              onNewConversation={handleNewConversation}
            />
          ) : (
            <>
              {/* Model selector or setup prompt */}
              {noModels ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    No AI providers configured yet.
                  </p>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate('/settings');
                    }}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Add API key in Settings →
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                  <select
                    value={selectedModel || ''}
                    onChange={(e) => setSelectedModel(e.target.value)}
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
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[40vh]">
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
                    isLastUserMessage={
                      message.role === 'user' &&
                      index === messages.length - 1 - [...messages].slice(index + 1).findIndex((m) => m.role === 'user') - 1
                    }
                    onEdit={
                      message.role === 'user' && !isStreaming
                        ? handleEditLastMessage
                        : undefined
                    }
                  />
                ))}

                {streamingContent && (
                  <MessageBubble
                    message={{
                      role: 'assistant',
                      content: streamingContent,
                    }}
                    isStreaming
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
              <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 dark:border-slate-700">
                {editingMessage !== null && (
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
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={noModels ? 'Configure AI in Settings first' : 'Ask a question...'}
                    disabled={noModels || isStreaming}
                    rows={1}
                    className={`flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      editingMessage !== null
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
                      <span className="animate-spin">⟳</span>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLastUserMessage?: boolean;
  onEdit?: () => void;
}

function MessageBubble({ message, isStreaming, isLastUserMessage, onEdit }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative">
        <div
          className={`max-w-[85%] rounded-xl px-3 py-2 ${
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

        {/* Edit button for user messages */}
        {isUser && onEdit && showActions && isLastUserMessage && (
          <button
            onClick={onEdit}
            className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit message"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface ConversationHistoryProps {
  conversations: AIConversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNewConversation: () => void;
}

function ConversationHistory({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNewConversation,
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
    <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[50vh]">
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
