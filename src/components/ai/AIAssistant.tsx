/**
 * AIAssistant - Floating chat widget for AI assistance
 *
 * Provides a floating button in the corner that expands to show
 * a chat interface. Supports multiple LLM providers with streaming,
 * conversation history, and message editing.
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAIStore,
  useAvailableModels,
  useConversationsStore,
} from '@/lib/ai';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ConversationHistory } from './AIConversationHistory';
import { AIChatView } from './AIChatView';
import { AIChatHeader } from './AIChatHeader';

type View = 'chat' | 'history';

export function AIAssistant() {
  const navigate = useNavigate();
  const {
    isOpen, toggle, setOpen,
    selectedModel, setSelectedModel,
    currentConversationId, messages,
    isStreaming, streamingContent, error,
    sendMessage, clearMessages,
    startNewConversation, loadConversation,
    editMessageAtIndex, deleteMessageAndAfter,
  } = useAIStore();

  const { conversations, loadConversations, deleteConversation } = useConversationsStore();
  const { models, isLoading: modelsLoading } = useAvailableModels();

  const [input, setInput] = useState('');
  const [view, setView] = useState<View>('chat');
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmMessageIndex, setDeleteConfirmMessageIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && view === 'history') loadConversations();
  }, [isOpen, view, loadConversations]);

  useEffect(() => {
    if (!selectedModel && models.length > 0) setSelectedModel(models[0].id);
  }, [models, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (isOpen && view === 'chat') setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, view]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const message = input;
    setInput('');
    if (editingMessageIndex !== null) {
      await editMessageAtIndex(editingMessageIndex, message);
      setEditingMessageIndex(null);
    } else {
      await sendMessage(message);
    }
  }, [input, isStreaming, sendMessage, editMessageAtIndex, editingMessageIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
    if (e.key === 'Escape') {
      if (editingMessageIndex !== null) { setEditingMessageIndex(null); setInput(''); }
      else if (isExpanded) { setIsExpanded(false); }
    }
  }, [handleSubmit, editingMessageIndex, isExpanded]);

  const handleEditMessage = useCallback((index: number) => {
    const message = messages[index];
    if (message && message.role === 'user') {
      setEditingMessageIndex(index);
      setInput(message.content);
      inputRef.current?.focus();
    }
  }, [messages]);

  const handleDeleteMessage = useCallback((index: number) => {
    setDeleteConfirmMessageIndex(index);
  }, []);

  const handleConfirmDeleteMessage = useCallback(async () => {
    if (deleteConfirmMessageIndex !== null) {
      await deleteMessageAndAfter(deleteConfirmMessageIndex);
      setDeleteConfirmMessageIndex(null);
    }
  }, [deleteConfirmMessageIndex, deleteMessageAndAfter]);

  const handleNewConversation = useCallback(() => {
    startNewConversation();
    setView('chat');
  }, [startNewConversation]);

  const handleSelectConversation = useCallback(async (id: string) => {
    await loadConversation(id);
    setView('chat');
  }, [loadConversation]);

  const handleDeleteClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteConfirmId) {
      await deleteConversation(deleteConfirmId);
      if (currentConversationId === deleteConfirmId) startNewConversation();
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteConversation, currentConversationId, startNewConversation]);

  const handleCloseAndNavigate = useCallback(() => {
    setOpen(false);
    navigate('/settings');
  }, [setOpen, navigate]);

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
        <div
          className={`fixed z-50 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'inset-4 sm:inset-8 rounded-2xl'
              : 'bottom-36 sm:bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] rounded-xl'
          }`}
        >
          <AIChatHeader
            view={view}
            onToggleView={() => setView(view === 'chat' ? 'history' : 'chat')}
            onNewConversation={handleNewConversation}
            onClearMessages={clearMessages}
            showClear={messages.length > 0 && view === 'chat'}
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded(!isExpanded)}
            onClose={() => setOpen(false)}
          />

          {view === 'history' ? (
            <ConversationHistory
              conversations={conversations}
              currentId={currentConversationId}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteClick}
              onNewConversation={handleNewConversation}
              isExpanded={isExpanded}
            />
          ) : (
            <AIChatView
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              error={error}
              isExpanded={isExpanded}
              noModels={noModels}
              modelsLoading={modelsLoading}
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onCloseAndNavigate={handleCloseAndNavigate}
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              editingMessageIndex={editingMessageIndex}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={deleteConfirmMessageIndex !== null}
        onClose={() => setDeleteConfirmMessageIndex(null)}
        onConfirm={handleConfirmDeleteMessage}
        title="Delete Message"
        message="This will delete this message and all messages after it. Continue?"
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
