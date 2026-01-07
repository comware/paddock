/**
 * OpenAI Provider - GPT-5 and beyond
 *
 * Uses the OpenAI Responses API for GPT-5+ models.
 * Does NOT support legacy models (GPT-4, GPT-3.5).
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

const OPENAI_API_BASE = 'https://api.openai.com/v1';

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

    try {
      const response = await fetch(`${OPENAI_API_BASE}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
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

    // Use the Responses API for GPT-5+ models
    const response = await fetch(`${OPENAI_API_BASE}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        input: messages,
        max_output_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json();

    // Extract text from the response output
    const outputText =
      data.output?.find((item: { type: string }) => item.type === 'message')
        ?.content?.[0]?.text || '';

    return {
      content: outputText,
      model: request.model,
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          }
        : undefined,
      finishReason: 'stop',
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
      const response = await fetch(`${OPENAI_API_BASE}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          input: messages,
          max_output_tokens: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.7,
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
              const delta =
                parsed.delta?.content?.[0]?.text ||
                parsed.choices?.[0]?.delta?.content ||
                '';
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
