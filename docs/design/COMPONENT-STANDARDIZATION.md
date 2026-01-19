# Paddock Component Standardization Recommendations

## Overview

This document outlines opportunities to standardize and unify components across Paddock, establishing a lightweight design system that improves consistency and reduces code duplication.

---

## Current Component Landscape

### UI Primitives (Shared)

| Component | Location | Reused? |
|-----------|----------|---------|
| Modal | `components/ui/Modal.tsx` | Yes |
| Tabs | `components/ui/Tabs.tsx` | Yes |
| ConfirmDialog | `components/ui/ConfirmDialog.tsx` | Yes |
| KeyboardShortcutsHelp | `components/ui/KeyboardShortcutsHelp.tsx` | Yes |

### Shared Components

| Component | Location | Reused? |
|-----------|----------|---------|
| EmptyState | `components/shared/EmptyState.tsx` | Underutilized |
| ComingSoon | `components/shared/ComingSoon.tsx` | Yes |
| ModuleLoader | `components/shared/ModuleLoader.tsx` | Yes |

### Module-Specific (Duplicated Patterns)

| Pattern | Grow Implementation | Propagation Implementation |
|---------|---------------------|---------------------------|
| Card Component | TrayCard, SiteCard | BatchCard, StationCard, MotherPlantCard |
| Dashboard | GrowDashboard | PropDashboard |
| Quick Actions | QuickActionButton (inline) | QuickActionButton (inline) |
| Metric Cards | MetricCard (inline) | MetricsCards component |
| List Views | TrayList, SiteList | BatchList, StationList |
| Forms | NewTrayForm, EditTrayForm | NewBatchForm, StationForm |

---

## Recommended Unified Components

### 1. DataCard Component

**Purpose:** Base card for displaying entity data (trays, batches, stations, etc.)

**Current Pattern Variations:**
- Border: All use `border-2 rounded-xl`
- Shadow: All use `shadow-sm`
- Hover: All use `hover:shadow-md transition-shadow`
- Background: Varies by status

**Proposed API:**

```tsx
// src/components/ui/DataCard.tsx

interface DataCardProps {
  children: React.ReactNode;
  status?: 'default' | 'active' | 'success' | 'warning' | 'danger' | 'muted';
  onClick?: () => void;
  className?: string;
}

const statusClasses: Record<string, string> = {
  default: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  active: 'bg-primary-50 dark:bg-primary-900/20 border-primary-500',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700',
  danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  muted: 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 opacity-75',
};

export function DataCard({ children, status = 'default', onClick, className }: DataCardProps) {
  return (
    <div
      className={`rounded-xl p-4 shadow-sm border-2 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow ${statusClasses[status]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

**Sub-components:**

```tsx
// Card Header
export function DataCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      {children}
    </div>
  );
}

// Card Body
export function DataCardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

// Card Actions
export function DataCardActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
}

// Card Stats Grid
export function DataCardStats({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const gridCols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
  return <div className={`grid ${gridCols[cols]} gap-2 text-sm mb-3`}>{children}</div>;
}
```

---

### 2. StatCard Component

**Purpose:** Display a single metric with optional target/subtitle.

**Current Pattern Variations:**
- GrowDashboard: Inline `MetricCard` function
- PropDashboard: Separate `MetricsCards` component
- TrendCharts: Inline `StatCard` function

**Proposed API:**

```tsx
// src/components/ui/StatCard.tsx

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
  target?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export function StatCard({
  label,
  value,
  suffix,
  subtitle,
  target,
  icon,
  trend,
  color = 'default',
  size = 'md',
}: StatCardProps) {
  const colorClasses = {
    default: 'text-slate-900 dark:text-white',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm ${sizeClasses[size]}`}>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
        {icon && <span>{icon}</span>}
        <span className="text-sm">{label}</span>
      </div>
      <div className={`${valueSizes[size]} font-bold ${colorClasses[color]}`}>
        {value}
        {suffix && <span className="text-base font-normal text-slate-500 ml-1">{suffix}</span>}
      </div>
      {target && <div className="text-sm text-slate-500 dark:text-slate-400">Target: {target}</div>}
      {subtitle && <div className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
    </div>
  );
}
```

---

### 3. Button Component

**Purpose:** Standardized button with size, variant, and state props.

**Current Pattern Variations:**
- Primary: `bg-primary-500 hover:bg-primary-600`
- Secondary: `bg-slate-100` or `border border-slate-300`
- Danger: `bg-red-*`
- Sizes: Inconsistent padding

**Proposed API:**

```tsx
// src/components/ui/Button.tsx

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
  secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  fullWidth,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-lg font-medium transition-colors
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner size="sm" />
          Processing...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {leftIcon}
          {children}
          {rightIcon}
        </span>
      )}
    </button>
  );
}
```

---

### 4. Badge Component

**Purpose:** Status badges, labels, tags.

**Current Pattern:** Inline classes with variations.

**Proposed API:**

```tsx
// src/components/ui/Badge.tsx

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  icon?: string;
}

const variantClasses = {
  default: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', icon }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}
```

---

### 5. Input Component

**Purpose:** Standardized text input with consistent styling.

**Proposed API:**

```tsx
// src/components/ui/Input.tsx

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 rounded-lg border
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:ring-primary-500'
          }
          bg-white dark:bg-slate-700 text-slate-900 dark:text-white
          focus:ring-2 focus:border-transparent
          placeholder:text-slate-400
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
```

---

### 6. LoadingState Component

**Purpose:** Consistent loading display.

**Proposed API:**

```tsx
// src/components/ui/LoadingState.tsx

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

export function LoadingState({ message = 'Loading...', size = 'md', inline = false }: LoadingStateProps) {
  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2 text-slate-500">
        <div className={`animate-spin rounded-full border-2 border-b-primary-500 ${spinnerSizes[size]}`} />
        {message}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-2 border-b-primary-500 ${spinnerSizes[size]}`} />
      {message && <p className="mt-4 text-slate-500 dark:text-slate-400">{message}</p>}
    </div>
  );
}
```

---

### 7. QuickSelect Component

**Purpose:** Quick value selection buttons (weights, quantities, etc.)

**Proposed API:**

```tsx
// src/components/ui/QuickSelect.tsx

interface QuickSelectProps<T extends string | number> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  formatOption?: (option: T) => string;
  size?: 'sm' | 'md';
}

export function QuickSelect<T extends string | number>({
  options,
  value,
  onChange,
  formatOption,
  size = 'md',
}: QuickSelectProps<T>) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-sm min-h-[44px]',
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={`
            rounded-lg font-medium transition-colors
            ${sizeClasses[size]}
            ${value === option
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }
          `}
        >
          {formatOption ? formatOption(option) : String(option)}
        </button>
      ))}
    </div>
  );
}
```

---

## Design Tokens

### Recommended Token Definition

```css
/* Add to index.css @theme section */

@theme {
  /* Spacing Scale */
  --spacing-card: 1rem;      /* 16px - card padding */
  --spacing-section: 1.5rem; /* 24px - section gaps */
  --spacing-field: 1rem;     /* 16px - form field gaps */

  /* Border Radius */
  --radius-sm: 0.5rem;   /* 8px - buttons, inputs */
  --radius-md: 0.75rem;  /* 12px - cards */
  --radius-lg: 1rem;     /* 16px - modals */
  --radius-full: 9999px; /* pills, badges */

  /* Touch Targets */
  --touch-min: 44px;     /* Minimum touch target */
  --touch-comfortable: 48px; /* Comfortable touch target */

  /* Z-Index Scale */
  --z-dropdown: 50;
  --z-modal: 100;
  --z-toast: 150;
  --z-tooltip: 200;
}
```

---

## Migration Strategy

### Phase 1: Create Components (No Breaking Changes)

1. Create new `src/components/ui/` components
2. Export from `src/components/ui/index.ts`
3. Document usage in Storybook or docs

### Phase 2: Migrate Propagation Module

1. Update BatchCard to use DataCard
2. Update PropDashboard to use StatCard
3. Update forms to use Button, Input

### Phase 3: Migrate Grow Module

1. Update TrayCard to use DataCard
2. Update GrowDashboard to use StatCard
3. Update forms to use Button, Input

### Phase 4: Cleanup

1. Remove inline component definitions
2. Update documentation
3. Add component tests

---

## Component Checklist

| Component | Status | Priority |
|-----------|--------|----------|
| Button | To Create | P1 |
| DataCard | To Create | P1 |
| StatCard | To Create | P1 |
| Badge | To Create | P2 |
| Input | To Create | P2 |
| LoadingState | To Create | P1 |
| QuickSelect | To Create | P2 |
| Select | To Create | P2 |
| Textarea | To Create | P3 |
| Checkbox | To Create | P3 |
| FilterPills | To Create | P2 |
