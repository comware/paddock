/**
 * AI Module - Multi-LLM support for Paddock
 *
 * Supports:
 * - OpenAI GPT-5+ (Responses API)
 * - Anthropic Claude 4.5+
 * - Google Gemini 3.0+
 */

export { aiService } from './service';
export {
  type LLMProvider,
  type LLMModel,
  type ChatMessage,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type StreamingCallbacks,
  SUPPORTED_MODELS,
  getModelsForProvider,
  getModelById,
} from './types';
export { useAIStore, useAvailableModels } from './store';
