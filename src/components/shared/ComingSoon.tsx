/**
 * ComingSoon - Placeholder for future modules
 */

interface ComingSoonProps {
  module: string;
}

export function ComingSoon({ module }: ComingSoonProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {module} Module
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Coming soon! This module will be built after the Microgreens module is complete.
        </p>
      </div>
    </div>
  );
}
