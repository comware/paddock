/**
 * AI Chat Store - State management for AI assistant
 *
 * Manages chat state including messages, model selection,
 * and streaming state. Now with conversation persistence support.
 */

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { aiService } from './service';
import type { ChatMessage, LLMModel } from './types';
import { useConversationsStore } from './conversations';

interface AIStore {
  // UI State
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;

  // Model selection
  selectedModel: string | null;
  setSelectedModel: (modelId: string) => void;

  // Current conversation
  currentConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  cancelStream: () => void;

  // Conversation management
  startNewConversation: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  editLastUserMessage: (newContent: string) => Promise<void>;
  editMessageAtIndex: (index: number, newContent: string) => Promise<void>;
  deleteMessageAndAfter: (index: number) => Promise<void>;

  // Internal
  _abortController: AbortController | null;
}

const SYSTEM_PROMPT = `You are Paddock AI, a knowledgeable microgreens growing assistant integrated into the Paddock farm management platform.

## Your Expertise

You are an expert in:
- Microgreens cultivation (seed selection, growing conditions, harvesting techniques)
- Small-scale farming operations and workflow optimization
- The Paddock platform and how to use it effectively

## Paddock Platform Features

Help users with these Paddock features:

**Tray Management** - Creating and tracking trays from seed to harvest, recording sow dates, blackout periods, and harvest dates.

**Multi-Site Support** - Managing multiple growing locations (home, farm, schools, etc.), filtering data by site, comparing performance across sites.

**Time Tracking** - Logging time on: watering/checking, sowing, harvesting, packaging, cleanup, research. Analyzing labor costs and efficiency.

**Observations & Experiments** - Recording daily observations, setting up experiments to compare techniques, analyzing results.

**Growing Guides** - Paddock includes 75+ variety guides:
- Getting Started: Core concepts, equipment, first tray, watering, troubleshooting
- Beginner: Sunflower, pea shoots, radish, broccoli, wheatgrass, buckwheat
- Intermediate: Mustard, arugula, cabbage, kale, chard, kohlrabi, cilantro
- Advanced: Basil, beet, amaranth, chia, celery, carrot, spinach, fennel
- Specialty: Popcorn shoots, wasabi mustard, purple kohlrabi, nasturtium

**Calendar & Planning** - Scheduling plantings, tracking harvest forecasts, planning production.

**Analytics** - Visualizing performance, tracking trends, making data-driven decisions.

## How You Help

1. **Growing Questions**: Practical advice on conditions, troubleshooting (mold, leggy growth, poor germination), harvest timing.
2. **Platform Guidance**: Explain features, suggest workflows, help users get value from Paddock.
3. **Data Interpretation**: Help understand analytics, identify patterns, suggest improvements.
4. **Problem Solving**: Ask clarifying questions, provide specific actionable solutions.

## Response Style

- **Concise** - farmers are busy, get to the point
- **Practical** - actionable steps, not theory
- **Specific** - use numbers (days, temperatures, densities) when helpful
- **Encouraging** - growing is a learning process

## Example Interactions

"My sunflower trays keep getting moldy" → Ask about blackout duration, humidity, airflow, seed density. Provide specific adjustments.

"How do I track time for different sites?" → Explain time entry, show site filtering, suggest task categories.

"What should I grow for a farmers market?" → Recommend pea shoots, sunflower, radish. Suggest calendar for staggered plantings.

"I'm new to microgreens" → Point to Getting Started guides, recommend sunflower or pea shoots to start.

Your goal: Help users grow successfully and get the most value from Paddock.`;

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
      currentConversationId: null,
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

        const conversationsStore = useConversationsStore.getState();

        // Create a new conversation if none exists
        let conversationId = state.currentConversationId;
        if (!conversationId) {
          conversationId = await conversationsStore.createConversation(undefined, modelId);
          set({ currentConversationId: conversationId });
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

        // Persist user message to IndexedDB
        await conversationsStore.addMessage(conversationId, userMessage);

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
              onComplete: async (response) => {
                const assistantMessage: ChatMessage = {
                  role: 'assistant',
                  content: response.content,
                  timestamp: new Date(),
                };

                // Persist assistant message to IndexedDB
                const currentId = get().currentConversationId;
                if (currentId) {
                  await conversationsStore.addMessage(currentId, assistantMessage);
                }

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
          currentConversationId: null,
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

      // Conversation management
      startNewConversation: async () => {
        const state = get();
        if (state._abortController) {
          state._abortController.abort();
        }
        set({
          currentConversationId: null,
          messages: [],
          isStreaming: false,
          streamingContent: '',
          error: null,
          _abortController: null,
        });
      },

      loadConversation: async (id: string) => {
        const state = get();
        if (state._abortController) {
          state._abortController.abort();
        }

        set({
          currentConversationId: id,
          isStreaming: false,
          streamingContent: '',
          error: null,
          _abortController: null,
        });

        // Load messages from IndexedDB
        const conversationsStore = useConversationsStore.getState();
        const messages = await conversationsStore.getMessages(id);
        set({ messages });
      },

      editLastUserMessage: async (newContent: string) => {
        const state = get();
        if (state.isStreaming) return;

        // Find the last user message
        const lastUserIndex = [...state.messages]
          .reverse()
          .findIndex((m) => m.role === 'user');

        if (lastUserIndex === -1) return;

        const actualIndex = state.messages.length - 1 - lastUserIndex;

        // Remove all messages from the last user message onwards
        const messagesUpToEdit = state.messages.slice(0, actualIndex);

        // Update local state
        set({ messages: messagesUpToEdit });

        // Now send the edited message as a new message
        // This will re-generate the AI response
        await get().sendMessage(newContent);
      },

      editMessageAtIndex: async (index: number, newContent: string) => {
        const state = get();
        if (state.isStreaming) return;
        if (index < 0 || index >= state.messages.length) return;
        if (state.messages[index].role !== 'user') return;

        // Remove all messages from this index onwards
        const messagesUpToEdit = state.messages.slice(0, index);
        set({ messages: messagesUpToEdit });

        // Send the edited message as a new message
        // This will re-generate the AI response
        await get().sendMessage(newContent);
      },

      deleteMessageAndAfter: async (index: number) => {
        const state = get();
        if (state.isStreaming) return;
        if (index < 0 || index >= state.messages.length) return;

        // Remove all messages from this index onwards
        const messagesUpToDelete = state.messages.slice(0, index);
        set({ messages: messagesUpToDelete });

        // Note: We're not syncing deletions to IndexedDB here
        // The conversation will be fully re-saved on next message send
      },
    }),
    {
      name: 'paddock-ai-chat',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        currentConversationId: state.currentConversationId,
        // Don't persist messages - they're in IndexedDB now
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
