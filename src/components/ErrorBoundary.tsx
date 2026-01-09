/**
 * ErrorBoundary - React error boundary for catching render errors
 *
 * Provides graceful error handling with retry capability and
 * helpful error messages for different scenarios.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { captureException } from '@/lib/monitoring/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Section name for contextual error messages */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Report to Sentry with component stack
    captureException(error, {
      section: this.props.section,
      componentStack: errorInfo.componentStack,
    });

    // Log to console for debugging
    console.error('ErrorBoundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const { section = 'This section' } = this.props;

      // Check for module loading errors (dynamic imports)
      const isModuleError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Failed to fetch');

      return (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                {isModuleError
                  ? 'Failed to Load'
                  : `${section} encountered an error`}
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {isModuleError
                  ? 'There was a problem loading this section. This can happen due to network issues or a stale browser cache.'
                  : 'Something went wrong while rendering this section.'}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-100 dark:bg-red-900/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Try Again
                </button>
                {isModuleError && (
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Refresh Page
                  </button>
                )}
              </div>
              {/* Show error details in development */}
              {import.meta.env.DEV && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-red-600 dark:text-red-400 hover:underline">
                    Technical details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 dark:bg-red-950/50 p-2 rounded overflow-auto max-h-32 text-red-800 dark:text-red-300">
                    {error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
