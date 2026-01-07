/**
 * AI Chat Store - State management for AI assistant
 *
 * Manages chat state including messages, model selection,
 * and streaming state.
 */

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { aiService, type ChatMessage, type LLMModel } from './index';

interface AIStore {
  // UI State
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;

  // Model selection
  selectedModel: string | null;
  setSelectedModel: (modelId: string) => void;

  // Current conversation
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  cancelStream: () => void;

  // Internal
  _abortController: AbortController | null;
}

const SYSTEM_PROMPT = `You are Paddock AI, a helpful assistant for small-scale farmers using the Paddock farm management platform.

Paddock is a local-first application for managing:
- Microgreens growing operations (trays, varieties, harvests)
- Experiment tracking and data collection
- Time tracking for farm tasks
- Planning and scheduling

You help users with:
- Growing advice for microgreens and other crops
- Using the Paddock application effectively
- Troubleshooting growing issues
- Planning harvests and production schedules
- General farming questions

Be concise, practical, and friendly. Focus on actionable advice.`;

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // UI State
      isOpen: false,
      setOpen: (open) => set({ isOpen: open }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      // Model selection - default to first available
      selectedModel: null,
      setSelectedModel: (modelId) => set({ selectedModel: modelId }),

      // Current conversation
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,

      // Internal
      _abortController: null,

      // Actions
      sendMessage: async (content: string) => {
        const state = get();
        if (state.isStreaming || !content.trim()) return;

        const modelId = state.selectedModel;
        if (!modelId) {
          set({ error: 'Please select a model first' });
          return;
        }

        // Add user message
        const userMessage: ChatMessage = {
          role: 'user',
          content: content.trim(),
          timestamp: new Date(),
        };

        const newMessages = [...state.messages, userMessage];
        set({
          messages: newMessages,
          isStreaming: true,
          streamingContent: '',
          error: null,
          _abortController: new AbortController(),
        });

        try {
          await aiService.chatStream(
            {
              model: modelId,
              messages: newMessages,
              systemPrompt: SYSTEM_PROMPT,
              temperature: 0.7,
            },
            {
              onToken: (token) => {
                set((state) => ({
                  streamingContent: state.streamingContent + token,
                }));
              },
              onComplete: (response) => {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: response.content,
                  timestamp: new Date(),
                };
                set((state) => ({
                  messages: [...state.messages, assistantMessage],
                  isStreaming: false,
                  streamingContent: '',
                  _abortController: null,
                }));
              },
              onError: (error) => {
                set({
                  isStreaming: false,
                  streamingContent: '',
                  error: error.message,
                  _abortController: null,
                });
              },
            }
          );
        } catch (error) {
          set({
            isStreaming: false,
            streamingContent: '',
            error: error instanceof Error ? error.message : 'Failed to send message',
            _abortController: null,
          });
        }
      },

      clearMessages: () => {
        const state = get();
        if (state._abortController) {
          state._abortController.abort();
        }
        set({
          messages: [],
          isStreaming: false,
          streamingContent: '',
          error: null,
          _abortController: null,
        });
      },

      cancelStream: () => {
        const state = get();
        if (state._abortController) {
          state._abortController.abort();
        }
        set({
          isStreaming: false,
          streamingContent: '',
          _abortController: null,
        });
      },
    }),
    {
      name: 'paddock-ai-chat',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        messages: state.messages,
      }),
    }
  )
);

/**
 * Hook to get available models (only from configured providers)
 */
export function useAvailableModels(): {
  models: LLMModel[];
  isLoading: boolean;
} {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      const available = await aiService.getAvailableModels();
      if (mounted) {
        setModels(available);
        setIsLoading(false);
      }
    }

    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  return { models, isLoading };
}
