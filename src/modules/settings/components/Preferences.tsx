/**
 * Preferences - User preferences settings
 *
 * Dark mode toggle and other app preferences.
 * Uses the global useTheme hook for theme management.
 */

import { useTheme, type Theme } from '@/hooks';

export function Preferences() {
  const { theme, setTheme, isLoading } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  if (isLoading) {
    return (
      <section className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Preferences
      </h2>

      <div className="space-y-4">
        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            <ThemeButton
              active={theme === 'light'}
              onClick={() => handleThemeChange('light')}
              icon="☀️"
              label="Light"
            />
            <ThemeButton
              active={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
              icon="🌙"
              label="Dark"
            />
            <ThemeButton
              active={theme === 'system'}
              onClick={() => handleThemeChange('system')}
              icon="💻"
              label="System"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            System will follow your device's dark mode setting
          </p>
        </div>
      </div>
    </section>
  );
}

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

function ThemeButton({ active, onClick, icon, label }: ThemeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-lg border-2 text-center transition-all ${
        active
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm font-medium text-slate-900 dark:text-white">
        {label}
      </div>
    </button>
  );
}
