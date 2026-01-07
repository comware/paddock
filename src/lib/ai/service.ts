/**
 * AI Service - Unified LLM interface
 *
 * Manages multiple LLM providers and provides a unified interface
 * for chat completions with automatic provider selection.
 */

import {
  type LLMProvider,
  type LLMModel,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type StreamingCallbacks,
  type ILLMProvider,
  SUPPORTED_MODELS,
  getModelById,
  API_KEY_STORAGE_KEYS,
} from './types';
import { openaiProvider } from './providers/openai';
import { anthropicProvider } from './providers/anthropic';
import { geminiProvider } from './providers/gemini';
import { platformDb } from '@/lib/db';

class AIService {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();

  constructor() {
    this.providers.set('openai', openaiProvider);
    this.providers.set('anthropic', anthropicProvider);
    this.providers.set('gemini', geminiProvider);
  }

  /**
   * Get all supported models
   */
  getAllModels(): LLMModel[] {
    return SUPPORTED_MODELS;
  }

  /**
   * Get a provider by name
   */
  getProvider(provider: LLMProvider): ILLMProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Get the provider for a specific model
   */
  getProviderForModel(modelId: string): ILLMProvider | undefined {
    const model = getModelById(modelId);
    if (!model) return undefined;
    return this.providers.get(model.provider);
  }

  /**
   * Check which providers are configured with API keys
   */
  async getConfiguredProviders(): Promise<LLMProvider[]> {
    const configured: LLMProvider[] = [];

    for (const [name, provider] of this.providers) {
      // Load API key to check if configured
      await provider.loadApiKey();
      if (provider.isConfigured()) {
        configured.push(name);
      }
    }

    return configured;
  }

  /**
   * Get models that are available (provider is configured)
   */
  async getAvailableModels(): Promise<LLMModel[]> {
    const configured = await this.getConfiguredProviders();
    return SUPPORTED_MODELS.filter((m) => configured.includes(m.provider));
  }

  /**
   * Save an API key for a provider
   */
  async saveApiKey(provider: LLMProvider, apiKey: string): Promise<void> {
    const key = API_KEY_STORAGE_KEYS[provider];

    const existing = await platformDb.settings
      .where('key')
      .equals(key)
      .first();

    if (existing) {
      await platformDb.settings.update(existing.id!, { value: apiKey });
    } else {
      await platformDb.settings.add({ key, value: apiKey });
    }

    // Clear cached key in provider
    const providerInstance = this.providers.get(provider);
    if (providerInstance) {
      // Force reload on next request
      providerInstance.apiKey = null;
    }
  }

  /**
   * Get the stored API key for a provider (masked for display)
   */
  async getApiKeyMasked(provider: LLMProvider): Promise<string | null> {
    const key = API_KEY_STORAGE_KEYS[provider];
    const setting = await platformDb.settings
      .where('key')
      .equals(key)
      .first();

    const value = setting?.value as string;
    if (!value) return null;

    // Mask all but last 4 characters
    if (value.length <= 8) {
      return '****' + value.slice(-4);
    }
    return value.slice(0, 4) + '...' + value.slice(-4);
  }

  /**
   * Delete an API key for a provider
   */
  async deleteApiKey(provider: LLMProvider): Promise<void> {
    const key = API_KEY_STORAGE_KEYS[provider];

    await platformDb.settings.where('key').equals(key).delete();

    // Clear cached key in provider
    const providerInstance = this.providers.get(provider);
    if (providerInstance) {
      providerInstance.apiKey = null;
    }
  }

  /**
   * Validate an API key for a provider
   */
  async validateApiKey(provider: LLMProvider): Promise<boolean> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return false;

    await providerInstance.loadApiKey();
    return providerInstance.validateKey();
  }

  /**
   * Send a chat completion request
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const provider = this.getProviderForModel(request.model);
    if (!provider) {
      throw new Error(`Model not found: ${request.model}`);
    }

    await provider.loadApiKey();
    if (!provider.isConfigured()) {
      throw new Error(
        `${provider.name} API key not configured. Please add your API key in Settings.`
      );
    }

    return provider.chat(request);
  }

  /**
   * Send a streaming chat completion request
   */
  async chatStream(
    request: ChatCompletionRequest,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const provider = this.getProviderForModel(request.model);
    if (!provider) {
      callbacks.onError(new Error(`Model not found: ${request.model}`));
      return;
    }

    await provider.loadApiKey();
    if (!provider.isConfigured()) {
      callbacks.onError(
        new Error(
          `${provider.name} API key not configured. Please add your API key in Settings.`
        )
      );
      return;
    }

    return provider.chatStream(request, callbacks);
  }
}

export const aiService = new AIService();
