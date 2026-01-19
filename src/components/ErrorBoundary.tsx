/**
 * ErrorBoundary - React error boundary for catching render errors
 *
 * Provides graceful error handling with retry capability and
 * helpful error messages for different scenarios.
 *
 * Features:
 * - Module isolation: Grow failing doesn't crash Propagation
 * - Navigation to working modules when error occurs
 * - IndexedDB corruption detection
 * - Report issue functionality
 * - Retry with exponential backoff awareness
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { captureException, exportErrorLog } from '@/lib/monitoring/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Section name for contextual error messages */
  section?: string;
  /** Module name for navigation (grow, propagation, planner) */
  module?: 'grow' | 'propagation' | 'planner' | 'settings';
  /** Show navigation to other modules on error */
  showModuleNav?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

// Module navigation for graceful degradation
const MODULE_NAV = [
  { name: 'Grow', path: '/grow', icon: '🌱' },
  { name: 'Propagation', path: '/propagation', icon: '🌿' },
  { name: 'Planner', path: '/planner', icon: '📅' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
] as const;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
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
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleReportIssue = () => {
    const { error, errorInfo } = this.state;
    const { section, module } = this.props;

    // Create a shareable error report
    const report = {
      timestamp: new Date().toISOString(),
      section,
      module,
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      recentErrors: exportErrorLog(),
    };

    // Copy to clipboard for easy sharing
    const reportText = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(reportText).then(
      () => alert('Error report copied to clipboard. Please share this with support.'),
      () => {
        // Fallback: download as file
        const blob = new Blob([reportText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paddock-error-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    );
  };

  // Check if this is an IndexedDB error
  isIndexedDBError = (): boolean => {
    const { error } = this.state;
    if (!error) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes('indexeddb') ||
      message.includes('dexie') ||
      message.includes('quota') ||
      message.includes('database') ||
      message.includes('transaction')
    );
  };

  // Check if this is a network/module loading error
  isModuleError = (): boolean => {
    const { error } = this.state;
    if (!error) return false;
    return (
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Loading chunk')
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const { section = 'This section', module, showModuleNav = false } = this.props;

      const isModuleError = this.isModuleError();
      const isIndexedDBError = this.isIndexedDBError();

      // Determine error title and description
      let title = `${section} encountered an error`;
      let description = 'Something went wrong while rendering this section.';

      if (isModuleError) {
        title = 'Failed to Load';
        description = 'There was a problem loading this section. This can happen due to network issues or a stale browser cache.';
      } else if (isIndexedDBError) {
        title = 'Database Error';
        description = 'There was a problem accessing your local data. This could be due to storage limits or data corruption.';
      }

      // Get other available modules (exclude current)
      const otherModules = MODULE_NAV.filter((m) => m.name.toLowerCase() !== module);

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
                {title}
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {description}
              </p>

              {/* Primary actions */}
              <div className="mt-4 flex flex-wrap gap-3">
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
                  Try Again {retryCount > 0 && `(${retryCount})`}
                </button>

                {isModuleError && (
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Refresh Page
                  </button>
                )}

                {isIndexedDBError && (
                  <button
                    onClick={() => window.location.href = '/settings'}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Go to Settings
                  </button>
                )}

                {/* Report Issue button - show after 2+ retries or immediately for IndexedDB errors */}
                {(retryCount >= 2 || isIndexedDBError) && (
                  <button
                    onClick={this.handleReportIssue}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                    Report Issue
                  </button>
                )}
              </div>

              {/* Module navigation for graceful degradation */}
              {showModuleNav && otherModules.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900/50">
                  <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                    Continue using other sections:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {otherModules.map((mod) => (
                      <a
                        key={mod.path}
                        href={mod.path}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span>{mod.icon}</span>
                        {mod.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
