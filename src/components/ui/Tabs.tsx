/**
 * Tabs - Reusable tab navigation component
 *
 * Features:
 * - Accessible tab navigation with keyboard support
 * - Active state styling
 * - Optional icons
 */

import { type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface TabPanelProps {
  isActive: boolean;
  children: ReactNode;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="flex gap-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-b-2 border-primary-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }
              `}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function TabPanel({ isActive, children }: TabPanelProps) {
  if (!isActive) return null;

  return (
    <div role="tabpanel" className="pt-4">
      {children}
    </div>
  );
}
