/**
 * AI Conversations Store - CRUD operations for conversation history
 *
 * Manages conversation persistence using IndexedDB via Dexie.
 * Supports creating, listing, updating, and deleting conversations.
 */

import { create } from 'zustand';
import { aiDb, type AIConversation, type AIMessage } from '@/lib/db/schema';
import type { ChatMessage } from './types';

interface ConversationsState {
  // Data
  conversations: AIConversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (title?: string, model?: string) => Promise<string>;
  loadConversation: (id: string) => Promise<ChatMessage[]>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;

  // Message operations
  addMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  updateLastMessage: (conversationId: string, content: string) => Promise<void>;
  getMessages: (conversationId: string) => Promise<ChatMessage[]>;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  error: null,

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await aiDb.conversations
        .orderBy('lastMessageAt')
        .reverse()
        .toArray();
      set({ conversations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        isLoading: false,
      });
    }
  },

  createConversation: async (title?: string, model?: string) => {
    const now = new Date();
    const conversation: AIConversation = {
      title: title || 'New conversation',
      model: model || '',
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const id = await aiDb.conversations.add(conversation);
    const createdConversation = { ...conversation, id: String(id) };

    set((state) => ({
      conversations: [createdConversation, ...state.conversations],
      currentConversationId: String(id),
    }));

    return String(id);
  },

  loadConversation: async (id: string) => {
    set({ currentConversationId: id });
    return get().getMessages(id);
  },

  updateConversationTitle: async (id: string, title: string) => {
    const numericId = parseInt(id, 10);
    await aiDb.conversations.update(numericId, {
      title,
      updatedAt: new Date(),
    });

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: new Date() } : c
      ),
    }));
  },

  deleteConversation: async (id: string) => {
    // Delete all messages first
    await aiDb.messages.where('conversationId').equals(id).delete();
    // Then delete the conversation (use numeric ID for Dexie)
    const numericId = parseInt(id, 10);
    await aiDb.conversations.delete(numericId);

    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
    }));
  },

  setCurrentConversation: (id: string | null) => {
    set({ currentConversationId: id });
  },

  addMessage: async (conversationId: string, message: ChatMessage) => {
    const now = new Date();
    const aiMessage: AIMessage = {
      conversationId,
      role: message.role,
      content: message.content,
      createdAt: message.timestamp || now,
    };

    await aiDb.messages.add(aiMessage);

    // Update conversation metadata
    const messageCount = await aiDb.messages
      .where('conversationId')
      .equals(conversationId)
      .count();

    // Generate title from first user message if it's a new conversation
    // Note: Dexie uses numeric IDs, so we need to handle both string and number
    const numericId = parseInt(conversationId, 10);
    const conversation = await aiDb.conversations.get(numericId);
    let title = conversation?.title || 'New conversation';

    if (messageCount === 1 && message.role === 'user') {
      // Generate title from first message (first 50 chars)
      title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }

    await aiDb.conversations.update(numericId, {
      messageCount,
      lastMessageAt: now,
      updatedAt: now,
      title,
    });

    // Update local state
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messageCount, lastMessageAt: now, updatedAt: now, title }
          : c
      ),
    }));
  },

  updateLastMessage: async (conversationId: string, content: string) => {
    // Get the last message for this conversation
    const messages = await aiDb.messages
      .where('conversationId')
      .equals(conversationId)
      .reverse()
      .limit(1)
      .toArray();

    if (messages.length > 0 && messages[0].id) {
      await aiDb.messages.update(messages[0].id, {
        content,
      });
    }
  },

  getMessages: async (conversationId: string) => {
    const messages = await aiDb.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('createdAt');

    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt,
    }));
  },
}));

/**
 * Auto-generate a title for a conversation based on the first user message
 */
export function generateConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\n/g, ' ');
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 50) + '...';
}
