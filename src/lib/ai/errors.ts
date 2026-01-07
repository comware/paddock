/**
 * AI Error Types and Classes
 *
 * Provides structured error handling for LLM API operations with
 * distinct error types for different failure scenarios.
 */

export type AIErrorType =
  | 'network' // Network connectivity issues
  | 'auth' // Invalid API key or authentication failure
  | 'rate_limit' // Rate limiting / quota exceeded
  | 'invalid_request' // Malformed request
  | 'model_not_found' // Model doesn't exist
  | 'content_filter' // Content blocked by safety filters
  | 'provider_error' // Generic provider-side error
  | 'unknown'; // Unknown error type

export interface AIErrorDetails {
  type: AIErrorType;
  provider?: string;
  statusCode?: number;
  retryAfter?: number; // Seconds to wait before retry (for rate limits)
  originalMessage?: string;
}

/**
 * Custom error class for AI/LLM operations
 * Provides user-friendly messages and actionable recovery suggestions
 */
export class AIError extends Error {
  readonly type: AIErrorType;
  readonly provider?: string;
  readonly statusCode?: number;
  readonly retryAfter?: number;
  readonly originalMessage?: string;
  readonly isRetryable: boolean;

  constructor(message: string, details: AIErrorDetails) {
    super(message);
    this.name = 'AIError';
    this.type = details.type;
    this.provider = details.provider;
    this.statusCode = details.statusCode;
    this.retryAfter = details.retryAfter;
    this.originalMessage = details.originalMessage;

    // Determine if error is retryable
    this.isRetryable = ['network', 'rate_limit', 'provider_error'].includes(
      this.type
    );
  }

  /**
   * Get a user-friendly error message with recovery suggestion
   */
  getUserMessage(): string {
    switch (this.type) {
      case 'network':
        return 'Unable to connect to the API. Please check your internet connection and try again.';

      case 'auth':
        return 'Invalid API key. Please verify your key is correct and has not expired.';

      case 'rate_limit':
        if (this.retryAfter) {
          return `Rate limit exceeded. Please wait ${this.retryAfter} seconds before trying again.`;
        }
        return 'Rate limit exceeded. Please wait a moment before trying again.';

      case 'invalid_request':
        return 'The request was invalid. Please try again with different input.';

      case 'model_not_found':
        return `The requested model is not available. It may have been deprecated or renamed.`;

      case 'content_filter':
        return 'The content was blocked by safety filters. Please modify your input.';

      case 'provider_error':
        return `The ${this.provider || 'AI'} service is experiencing issues. Please try again later.`;

      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get a short error summary for UI badges/pills
   */
  getShortMessage(): string {
    switch (this.type) {
      case 'network':
        return 'Connection failed';
      case 'auth':
        return 'Invalid API key';
      case 'rate_limit':
        return 'Rate limited';
      case 'invalid_request':
        return 'Invalid request';
      case 'model_not_found':
        return 'Model unavailable';
      case 'content_filter':
        return 'Content blocked';
      case 'provider_error':
        return 'Service error';
      default:
        return 'Error';
    }
  }
}

/**
 * Parse an error from an API response and create an AIError
 */
export function parseApiError(
  error: unknown,
  provider: string
): AIError {
  // Handle fetch network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AIError('Network error occurred', {
      type: 'network',
      provider,
      originalMessage: error.message,
    });
  }

  // Handle Response objects with status codes
  if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
    const response = error as Response;
    const status = response.status;

    if (status === 401 || status === 403) {
      return new AIError('Authentication failed', {
        type: 'auth',
        provider,
        statusCode: status,
      });
    }

    if (status === 429) {
      const retryAfter = parseInt(
        response.headers?.get('retry-after') || '60',
        10
      );
      return new AIError('Rate limit exceeded', {
        type: 'rate_limit',
        provider,
        statusCode: status,
        retryAfter,
      });
    }

    if (status === 400) {
      return new AIError('Invalid request', {
        type: 'invalid_request',
        provider,
        statusCode: status,
      });
    }

    if (status === 404) {
      return new AIError('Model not found', {
        type: 'model_not_found',
        provider,
        statusCode: status,
      });
    }

    if (status >= 500) {
      return new AIError('Provider service error', {
        type: 'provider_error',
        provider,
        statusCode: status,
      });
    }
  }

  // Handle error objects with message property
  if (error instanceof Error) {
    // Check for specific error patterns in message
    const msg = error.message.toLowerCase();

    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect')) {
      return new AIError(error.message, {
        type: 'network',
        provider,
        originalMessage: error.message,
      });
    }

    if (msg.includes('unauthorized') || msg.includes('invalid') && msg.includes('key')) {
      return new AIError(error.message, {
        type: 'auth',
        provider,
        originalMessage: error.message,
      });
    }

    if (msg.includes('rate') || msg.includes('limit') || msg.includes('quota')) {
      return new AIError(error.message, {
        type: 'rate_limit',
        provider,
        originalMessage: error.message,
      });
    }

    return new AIError(error.message, {
      type: 'unknown',
      provider,
      originalMessage: error.message,
    });
  }

  // Fallback for unknown error types
  return new AIError('An unexpected error occurred', {
    type: 'unknown',
    provider,
    originalMessage: String(error),
  });
}
