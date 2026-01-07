/**
 * OpenAI Provider - GPT-5.2 models
 *
 * Uses the OpenAI Chat Completions API for latest GPT models.
 * Supports: GPT-5.2 Thinking, GPT-5.2 Instant, GPT-5.2 Pro
 */

import {
  type ILLMProvider,
  type LLMModel,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type StreamingCallbacks,
  getModelsForProvider,
  API_KEY_STORAGE_KEYS,
} from '../types';
import { platformDb } from '@/lib/db';

// Use proxy in development to bypass CORS
const OPENAI_API_BASE = '/api/openai/v1';

export class OpenAIProvider implements ILLMProvider {
  name = 'openai' as const;
  apiKey: string | null = null;

  async loadApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;

    try {
      const setting = await platformDb.settings
        .where('key')
        .equals(API_KEY_STORAGE_KEYS.openai)
        .first();
      this.apiKey = (setting?.value as string) || null;
      return this.apiKey;
    } catch {
      return null;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async validateKey(): Promise<boolean> {
    const apiKey = await this.loadApiKey();
    if (!apiKey) return false;

    // Basic format validation
    if (!apiKey.startsWith('sk-')) {
      return false;
    }

    try {
      const response = await fetch(`${OPENAI_API_BASE}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      // Network error or CORS - accept format-valid keys
      return true;
    }
  }

  getModels(): LLMModel[] {
    return getModelsForProvider('openai');
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build messages array with system prompt
    const messages = request.systemPrompt
      ? [
          { role: 'system' as const, content: request.systemPrompt },
          ...request.messages.map((m) => ({ role: m.role, content: m.content })),
        ]
      : request.messages.map((m) => ({ role: m.role, content: m.content }));

    // Use the Chat Completions API
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages,
        max_completion_tokens: request.maxTokens || 4096,
        // GPT-5.2 models only support temperature=1
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content || '';
    const finishReason = data.choices?.[0]?.finish_reason;

    return {
      content,
      model: request.model,
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          }
        : undefined,
      finishReason:
        finishReason === 'stop'
          ? 'stop'
          : finishReason === 'length'
            ? 'length'
            : finishReason === 'content_filter'
              ? 'content_filter'
              : 'stop',
    };
  }

  async chatStream(
    request: ChatCompletionRequest,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      callbacks.onError(new Error('OpenAI API key not configured'));
      return;
    }

    // Build messages array with system prompt
    const messages = request.systemPrompt
      ? [
          { role: 'system' as const, content: request.systemPrompt },
          ...request.messages.map((m) => ({ role: m.role, content: m.content })),
        ]
      : request.messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          max_completion_tokens: request.maxTokens || 4096,
          // GPT-5.2 models only support temperature=1
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `OpenAI API error: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                callbacks.onToken(delta);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      callbacks.onComplete({
        content: fullContent,
        model: request.model,
        finishReason: 'stop',
      });
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

export const openaiProvider = new OpenAIProvider();
