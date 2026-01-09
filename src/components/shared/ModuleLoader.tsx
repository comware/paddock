/**
 * ModuleLoader - Loading fallback for lazy-loaded modules
 */

export function ModuleLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse">🌱</div>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Loading...</p>
      </div>
    </div>
  );
}
