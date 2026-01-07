/**
 * Anthropic Provider - Claude 4.5 and beyond
 *
 * Uses the Anthropic Messages API for Claude 4.5+ models.
 * Does NOT support legacy models (Claude 3, Claude 2).
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

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2024-01-01';

export class AnthropicProvider implements ILLMProvider {
  name = 'anthropic' as const;
  apiKey: string | null = null;

  async loadApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;

    try {
      const setting = await platformDb.settings
        .where('key')
        .equals(API_KEY_STORAGE_KEYS.anthropic)
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

    // Basic format validation - Anthropic keys start with sk-ant-
    if (!apiKey.startsWith('sk-ant-')) {
      return false;
    }

    // Note: Browser-based validation is not possible due to CORS restrictions.
    // The Anthropic API does not allow cross-origin requests from browsers.
    // We accept keys that pass format validation; actual validation happens on first use.
    // This is a known limitation of client-side-only applications.
    return true;
  }

  getModels(): LLMModel[] {
    return getModelsForProvider('anthropic');
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Convert messages to Anthropic format
    const messages = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Anthropic API error: ${response.status}`
      );
    }

    const data = await response.json();

    return {
      content: data.content?.[0]?.text || '',
      model: request.model,
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          }
        : undefined,
      finishReason:
        data.stop_reason === 'end_turn'
          ? 'stop'
          : data.stop_reason === 'max_tokens'
            ? 'length'
            : 'stop',
    };
  }

  async chatStream(
    request: ChatCompletionRequest,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      callbacks.onError(new Error('Anthropic API key not configured'));
      return;
    }

    // Convert messages to Anthropic format
    const messages = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.7,
          system: request.systemPrompt,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `Anthropic API error: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;

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

              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || '';
                if (delta) {
                  fullContent += delta;
                  callbacks.onToken(delta);
                }
              } else if (parsed.type === 'message_start') {
                inputTokens = parsed.message?.usage?.input_tokens || 0;
              } else if (parsed.type === 'message_delta') {
                outputTokens = parsed.usage?.output_tokens || 0;
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
        usage: {
          inputTokens,
          outputTokens,
        },
        finishReason: 'stop',
      });
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

export const anthropicProvider = new AnthropicProvider();
