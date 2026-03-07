/**
 * AI Service Tests
 *
 * Tests for the AIService class covering model lookup,
 * provider management, and error handling for chat methods.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SUPPORTED_MODELS, type LLMModel } from '../types';

// Mock the database module before importing the service
vi.mock('@/lib/db', () => ({
  platformDb: {
    settings: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          delete: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      add: vi.fn().mockResolvedValue('1'),
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

// Mock crypto module
vi.mock('../crypto', () => ({
  encrypt: vi.fn().mockResolvedValue('encrypted_value'),
  decrypt: vi.fn().mockResolvedValue('decrypted_value'),
  isEncrypted: vi.fn().mockReturnValue(false),
}));

// Mock providers with inline factories (vi.mock is hoisted, so no external refs)
vi.mock('../providers/openai', () => ({
  openaiProvider: {
    name: 'openai',
    apiKey: null,
    loadApiKey: vi.fn().mockResolvedValue(null),
    isConfigured: vi.fn().mockReturnValue(false),
    validateKey: vi.fn().mockResolvedValue(false),
    chat: vi.fn(),
    chatStream: vi.fn(),
    getModels: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../providers/anthropic', () => ({
  anthropicProvider: {
    name: 'anthropic',
    apiKey: null,
    loadApiKey: vi.fn().mockResolvedValue(null),
    isConfigured: vi.fn().mockReturnValue(false),
    validateKey: vi.fn().mockResolvedValue(false),
    chat: vi.fn(),
    chatStream: vi.fn(),
    getModels: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../providers/gemini', () => ({
  geminiProvider: {
    name: 'gemini',
    apiKey: null,
    loadApiKey: vi.fn().mockResolvedValue(null),
    isConfigured: vi.fn().mockReturnValue(false),
    validateKey: vi.fn().mockResolvedValue(false),
    chat: vi.fn(),
    chatStream: vi.fn(),
    getModels: vi.fn().mockReturnValue([]),
  },
}));

// Import after mocks are set up
import { aiService } from '../service';

describe('AIService', () => {
  const service = aiService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllModels', () => {
    it('should return the full list of supported models', () => {
      const models = service.getAllModels();
      expect(models).toBe(SUPPORTED_MODELS);
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m: LLMModel) => m.id && m.name && m.provider)).toBe(true);
    });
  });

  describe('getProvider', () => {
    it('should return the OpenAI provider', () => {
      const provider = service.getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider!.name).toBe('openai');
    });

    it('should return the Anthropic provider', () => {
      const provider = service.getProvider('anthropic');
      expect(provider).toBeDefined();
      expect(provider!.name).toBe('anthropic');
    });

    it('should return the Gemini provider', () => {
      const provider = service.getProvider('gemini');
      expect(provider).toBeDefined();
      expect(provider!.name).toBe('gemini');
    });

    it('should return undefined for unknown provider', () => {
      const provider = service.getProvider('unknown' as never);
      expect(provider).toBeUndefined();
    });
  });

  describe('getProviderForModel', () => {
    it('should return the correct provider for a known OpenAI model', () => {
      const provider = service.getProviderForModel('gpt-5.2');
      expect(provider).toBeDefined();
      expect(provider!.name).toBe('openai');
    });

    it('should return the correct provider for a known Anthropic model', () => {
      const provider = service.getProviderForModel('claude-opus-4-5-20251101');
      expect(provider).toBeDefined();
      expect(provider!.name).toBe('anthropic');
    });

    it('should return the correct provider for a known Gemini model', () => {
      const provider = service.getProviderForModel('gemini-3-pro-preview');
      expect(provider).toBeDefined();
      expect(provider!.name).toBe('gemini');
    });

    it('should return undefined for an unknown model ID', () => {
      const provider = service.getProviderForModel('nonexistent-model');
      expect(provider).toBeUndefined();
    });
  });

  describe('chat', () => {
    it('should throw an error when model is not found', async () => {
      await expect(
        service.chat({
          model: 'nonexistent-model',
          messages: [{ role: 'user', content: 'hello' }],
        })
      ).rejects.toThrow('Model not found: nonexistent-model');
    });
  });

  describe('chatStream', () => {
    it('should call onError when model is not found', async () => {
      const onError = vi.fn();
      const callbacks = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError,
      };

      await service.chatStream(
        {
          model: 'nonexistent-model',
          messages: [{ role: 'user', content: 'hello' }],
        },
        callbacks
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(onError.mock.calls[0][0].message).toBe(
        'Model not found: nonexistent-model'
      );
    });
  });
});
