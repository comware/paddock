/**
 * Gemini Provider - Gemini 3 and 2.5 models
 *
 * Uses the Google Gemini API for latest Gemini models.
 * Supports: Gemini 3 Pro/Flash, Gemini 2.5 Pro/Flash
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
import { decrypt, isEncrypted } from '../crypto';

// Use proxy in development to bypass CORS, direct API in production with backend
const GEMINI_API_BASE = '/api/gemini/v1beta';

export class GeminiProvider implements ILLMProvider {
  name = 'gemini' as const;
  apiKey: string | null = null;

  async loadApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;

    try {
      const setting = await platformDb.settings
        .where('key')
        .equals(API_KEY_STORAGE_KEYS.gemini)
        .first();
      const storedValue = (setting?.value as string) || null;
      if (!storedValue) return null;

      // Decrypt if encrypted, otherwise use as-is (migration for existing plaintext keys)
      try {
        this.apiKey = isEncrypted(storedValue) ? await decrypt(storedValue) : storedValue;
      } catch {
        this.apiKey = storedValue;
      }
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

    // Basic format validation - Gemini keys typically start with AIza
    if (!apiKey.startsWith('AIza')) {
      return false;
    }

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models`,
        { headers: { 'x-goog-api-key': apiKey } }
      );
      return response.ok;
    } catch {
      // Network error or CORS - accept format-valid keys
      return true;
    }
  }

  getModels(): LLMModel[] {
    return getModelsForProvider('gemini');
  }

  private convertMessagesToGeminiFormat(
    messages: { role: string; content: string }[],
    systemPrompt?: string
  ) {
    // Gemini uses 'user' and 'model' roles
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // System instruction is separate in Gemini API
    return {
      contents,
      systemInstruction: systemPrompt
        ? { parts: [{ text: systemPrompt }] }
        : undefined,
    };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { contents, systemInstruction } = this.convertMessagesToGeminiFormat(
      request.messages,
      request.systemPrompt
    );

    const modelName = `models/${request.model}`;
    const response = await fetch(
      `${GEMINI_API_BASE}/${modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            maxOutputTokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const finishReason = data.candidates?.[0]?.finishReason;

    return {
      content: text,
      model: request.model,
      usage: data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount || 0,
            outputTokens: data.usageMetadata.candidatesTokenCount || 0,
          }
        : undefined,
      finishReason:
        finishReason === 'STOP'
          ? 'stop'
          : finishReason === 'MAX_TOKENS'
            ? 'length'
            : finishReason === 'SAFETY'
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
      callbacks.onError(new Error('Gemini API key not configured'));
      return;
    }

    const { contents, systemInstruction } = this.convertMessagesToGeminiFormat(
      request.messages,
      request.systemPrompt
    );

    try {
      const modelName = `models/${request.model}`;
      const response = await fetch(
        `${GEMINI_API_BASE}/${modelName}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
              maxOutputTokens: request.maxTokens || 4096,
              temperature: request.temperature ?? 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `Gemini API error: ${response.status}`
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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';

              if (text) {
                fullContent += text;
                callbacks.onToken(text);
              }

              // Update token counts if available
              if (parsed.usageMetadata) {
                inputTokens = parsed.usageMetadata.promptTokenCount || inputTokens;
                outputTokens =
                  parsed.usageMetadata.candidatesTokenCount || outputTokens;
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

export const geminiProvider = new GeminiProvider();
