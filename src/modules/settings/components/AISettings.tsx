/**
 * AISettings - API key management for LLM providers
 *
 * Allows users to configure API keys for OpenAI, Anthropic, and Gemini.
 * Supports GPT-5.2, Claude 4.5+, and Gemini 3 models.
 */

import { useState, useEffect, useCallback } from 'react';
import { aiService, type LLMProvider, getModelsForProvider, parseApiError, type AIErrorType } from '@/lib/ai';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ProviderConfig {
  id: LLMProvider;
  name: string;
  icon: string;
  description: string;
  keyPlaceholder: string;
  docsUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-5.2 Thinking, Instant, Pro',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    description: 'Claude Opus 4.5, Claude Sonnet 4.5',
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    description: 'Gemini 3 Pro, Gemini 3 Flash',
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
];

function AISettingsContent() {
  const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
  });
  const [maskedKeys, setMaskedKeys] = useState<Record<LLMProvider, string | null>>({
    openai: null,
    anthropic: null,
    gemini: null,
  });
  const [validationStatus, setValidationStatus] = useState<
    Record<LLMProvider, 'idle' | 'validating' | 'valid' | AIErrorType>
  >({
    openai: 'idle',
    anthropic: 'idle',
    gemini: 'idle',
  });
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing API keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      const newMaskedKeys: Record<LLMProvider, string | null> = {
        openai: null,
        anthropic: null,
        gemini: null,
      };

      for (const provider of PROVIDERS) {
        const masked = await aiService.getApiKeyMasked(provider.id);
        newMaskedKeys[provider.id] = masked;
      }

      setMaskedKeys(newMaskedKeys);
      setIsLoading(false);
    };

    loadKeys();
  }, []);

  const handleSaveKey = useCallback(async (provider: LLMProvider) => {
    const key = apiKeys[provider].trim();
    if (!key) return;

    setValidationStatus((prev) => ({ ...prev, [provider]: 'validating' }));

    try {
      // Save the key first
      await aiService.saveApiKey(provider, key);

      // Then validate it
      const isValid = await aiService.validateApiKey(provider);

      if (isValid) {
        setValidationStatus((prev) => ({ ...prev, [provider]: 'valid' }));
        // Update masked key
        const masked = await aiService.getApiKeyMasked(provider);
        setMaskedKeys((prev) => ({ ...prev, [provider]: masked }));
        // Clear input and exit edit mode
        setApiKeys((prev) => ({ ...prev, [provider]: '' }));
        setEditingProvider(null);

        // Reset status after 2 seconds
        setTimeout(() => {
          setValidationStatus((prev) => ({ ...prev, [provider]: 'idle' }));
        }, 2000);
      } else {
        // Validation returned false - this is an auth error
        setValidationStatus((prev) => ({ ...prev, [provider]: 'auth' }));
        // Delete the invalid key
        await aiService.deleteApiKey(provider);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save API key:', error);
      // Parse the error to get a specific error type
      const aiError = parseApiError(error, provider);
      setValidationStatus((prev) => ({ ...prev, [provider]: aiError.type }));
      // Delete key if it was an auth error
      if (aiError.type === 'auth') {
        await aiService.deleteApiKey(provider);
      }
    }
  }, [apiKeys]);

  const handleDeleteKey = useCallback(async (provider: LLMProvider) => {
    try {
      await aiService.deleteApiKey(provider);
      setMaskedKeys((prev) => ({ ...prev, [provider]: null }));
      setApiKeys((prev) => ({ ...prev, [provider]: '' }));
      setEditingProvider(null);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete API key:', error);
      alert('Failed to delete API key. Please try again.');
    }
  }, []);

  if (isLoading) {
    return (
      <section className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        AI Assistant
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Configure API keys to enable the AI assistant. Only modern models are
        supported.
      </p>

      <div className="space-y-4">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            maskedKey={maskedKeys[provider.id]}
            apiKey={apiKeys[provider.id]}
            validationStatus={validationStatus[provider.id]}
            isEditing={editingProvider === provider.id}
            onEdit={() => setEditingProvider(provider.id)}
            onCancel={() => {
              setEditingProvider(null);
              setApiKeys((prev) => ({ ...prev, [provider.id]: '' }));
              setValidationStatus((prev) => ({ ...prev, [provider.id]: 'idle' }));
            }}
            onKeyChange={(value) =>
              setApiKeys((prev) => ({ ...prev, [provider.id]: value }))
            }
            onSave={() => handleSaveKey(provider.id)}
            onDelete={() => handleDeleteKey(provider.id)}
          />
        ))}
      </div>
    </section>
  );
}

interface ProviderCardProps {
  provider: ProviderConfig;
  maskedKey: string | null;
  apiKey: string;
  validationStatus: 'idle' | 'validating' | 'valid' | AIErrorType;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onKeyChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}

/**
 * Get user-friendly error message based on error type
 */
function getValidationErrorMessage(errorType: AIErrorType, providerName: string): string {
  switch (errorType) {
    case 'auth':
      return 'Invalid API key. Please verify your key is correct and has not expired.';
    case 'network':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'rate_limit':
      return 'Rate limit exceeded. Please wait a moment before trying again.';
    case 'provider_error':
      return `${providerName} is experiencing issues. Please try again later.`;
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Check if status represents an error state
 */
function isErrorStatus(status: string): status is AIErrorType {
  return !['idle', 'validating', 'valid'].includes(status);
}

function ProviderCard({
  provider,
  maskedKey,
  apiKey,
  validationStatus,
  isEditing,
  onEdit,
  onCancel,
  onKeyChange,
  onSave,
  onDelete,
}: ProviderCardProps) {
  const models = getModelsForProvider(provider.id);
  const isConfigured = !!maskedKey;
  const hasError = isErrorStatus(validationStatus);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{provider.icon}</span>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white">
              {provider.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {provider.description}
            </p>
          </div>
        </div>
        {isConfigured && !isEditing && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            ✓ Configured
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder={provider.keyPlaceholder}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            {hasError && (
              <p className="text-sm text-red-500 mt-1">
                {getValidationErrorMessage(validationStatus as AIErrorType, provider.name)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={!apiKey.trim() || validationStatus === 'validating'}
              className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validationStatus === 'validating' ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin">⟳</span> Validating...
                </span>
              ) : validationStatus === 'valid' ? (
                '✓ Saved'
              ) : (
                'Save Key'
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm"
            >
              Cancel
            </button>
            {isConfigured && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-red-500 hover:text-red-600 text-sm ml-auto"
              >
                Delete Key
              </button>
            )}
          </div>
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-500 hover:text-primary-600 inline-flex items-center gap-1"
          >
            Get API key →
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {isConfigured ? (
            <code className="text-sm text-slate-600 dark:text-slate-400 font-mono">
              {maskedKey}
            </code>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              No API key configured
            </span>
          )}
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            {isConfigured ? 'Change' : 'Add Key'}
          </button>
        </div>
      )}

      {/* Model list */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          Available models:
        </p>
        <div className="flex flex-wrap gap-1">
          {models.map((model) => (
            <span
              key={model.id}
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                isConfigured
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              {model.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * AISettings wrapped with ErrorBoundary for graceful error handling
 */
export function AISettings() {
  return (
    <ErrorBoundary section="AI Settings">
      <AISettingsContent />
    </ErrorBoundary>
  );
}
