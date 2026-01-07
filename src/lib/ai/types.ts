/**
 * AI Types - Common types for LLM providers
 *
 * Defines the abstraction layer for multi-LLM support.
 * Supports modern models: GPT-4o+, Claude 4.5+, Gemini 3+
 */

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
}

// Modern models with real API model IDs
export const SUPPORTED_MODELS: LLMModel[] = [
  // OpenAI GPT-4o and beyond
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsVision: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsVision: true,
  },
  // Anthropic Claude 3.5/4 (latest models)
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsVision: true,
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsVision: true,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsVision: true,
  },
  // Google Gemini 3 (latest)
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'gemini',
    contextWindow: 1048576,
    supportsStreaming: true,
    supportsVision: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    supportsStreaming: true,
    supportsVision: true,
  },
];

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter';
}

export interface StreamingCallbacks {
  onToken: (token: string) => void;
  onComplete: (response: ChatCompletionResponse) => void;
  onError: (error: Error) => void;
}

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Abstract LLM Provider interface
 * Each provider implements this interface with their native API
 */
export interface ILLMProvider {
  name: LLMProvider;

  /**
   * Load the API key from storage
   */
  loadApiKey(): Promise<string | null>;

  /**
   * Check if the provider is configured with an API key
   */
  isConfigured(): boolean;

  /**
   * Validate the API key by making a test request
   */
  validateKey(): Promise<boolean>;

  /**
   * Get available models for this provider
   */
  getModels(): LLMModel[];

  /**
   * Send a chat completion request (non-streaming)
   */
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Send a streaming chat completion request
   */
  chatStream(
    request: ChatCompletionRequest,
    callbacks: StreamingCallbacks
  ): Promise<void>;

  /**
   * Internal: Current API key (may be null if not loaded)
   */
  apiKey: string | null;
}

/**
 * API key storage keys for each provider
 */
export const API_KEY_STORAGE_KEYS = {
  openai: 'ai_openai_api_key',
  anthropic: 'ai_anthropic_api_key',
  gemini: 'ai_gemini_api_key',
} as const;

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: LLMProvider): LLMModel[] {
  return SUPPORTED_MODELS.filter((m) => m.provider === provider);
}

/**
 * Get a model by ID
 */
export function getModelById(modelId: string): LLMModel | undefined {
  return SUPPORTED_MODELS.find((m) => m.id === modelId);
}
