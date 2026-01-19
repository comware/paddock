# Component Color Mappings

## Overview

This document maps design tokens to specific UI components across Paddock. It serves as a reference for implementing consistent theming throughout the application.

---

## Shell Components

### TopNav

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Container | `bg-white` | `dark:bg-slate-800` |
| Border | `border-slate-200` | `dark:border-slate-700` |
| Logo text | `text-slate-900` | `dark:text-white` |
| Nav item (inactive) | `text-slate-600` | `dark:text-slate-300` |
| Nav item (hover) | `hover:bg-slate-100` | `dark:hover:bg-slate-700` |
| Nav item (active) | `bg-primary-100 text-primary-700` | `dark:bg-primary-900/30 dark:text-primary-300` |
| Disabled item | `text-slate-400` | `dark:text-slate-500` |

### BottomNav

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Container | `bg-white` | `dark:bg-slate-800` |
| Border | `border-slate-200` | `dark:border-slate-700` |
| Icon (inactive) | `text-slate-400` | `dark:text-slate-500` |
| Icon (active) | `text-primary-600` | `dark:text-primary-400` |
| Label (inactive) | `text-slate-500` | `dark:text-slate-400` |
| Label (active) | `text-primary-600` | `dark:text-primary-400` |

### AppShell

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Main background | `bg-slate-50` | `dark:bg-slate-900` |
| Content area | `bg-slate-50` | `dark:bg-slate-900` |

---

## Cards & Surfaces

### Generic Card (`.card`)

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Background | `bg-white` | `dark:bg-slate-800` |
| Border | `border-slate-200` | `dark:border-slate-700` |
| Shadow | `shadow-sm` | `shadow-sm` |

**Recommended CSS class:**
```css
.card {
  @apply bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm;
}
```

### TrayCard (Grow Module)

| Status | Light Classes | Dark Classes |
|--------|---------------|--------------|
| Blackout | `bg-slate-800 text-white` | Same |
| Light | `bg-yellow-50 text-yellow-900` | `dark:bg-yellow-900/20 dark:text-yellow-100` |
| Harvested | `bg-green-50 text-green-900` | `dark:bg-green-900/20 dark:text-green-100` |
| Failed | `bg-red-50 text-red-900` | `dark:bg-red-900/20 dark:text-red-100` |

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Needs action border | `border-orange-400 ring-orange-200` | `dark:border-orange-500 dark:ring-orange-900/50` |
| Status badge | Status-specific badgeClass | (see statusConfig) |
| Stats label | `opacity-70` | Same |

### BatchCard (Propagation Module)

| Status | Light Classes | Dark Classes |
|--------|---------------|--------------|
| Default | `bg-white` | `dark:bg-slate-800` |
| Overdue | `bg-orange-50 border-orange-300` | `dark:bg-orange-900/20 dark:border-orange-700` |
| Failed | `bg-red-50 border-red-200` | `dark:bg-red-900/20 dark:border-red-800` |
| Graduated | `bg-emerald-50 border-emerald-200` | `dark:bg-emerald-900/20 dark:border-emerald-800` |

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Batch number | `text-slate-900` | `dark:text-white` |
| Species name | `text-slate-900` | `dark:text-white` |
| Variety | `text-slate-600` | `dark:text-slate-400` |
| Stat label | `text-slate-500` | `dark:text-slate-400` |
| Stat value | `text-slate-700` | `dark:text-slate-300` |
| Divider | `border-slate-200` | `dark:border-slate-700` |

---

## Form Elements

### Input Fields

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Background | `bg-white` | `dark:bg-slate-700` |
| Border | `border-slate-300` | `dark:border-slate-600` |
| Border (focus) | `focus:border-primary-500` | `dark:focus:border-primary-400` |
| Ring (focus) | `focus:ring-primary-500/20` | `dark:focus:ring-primary-400/20` |
| Text | `text-slate-900` | `dark:text-white` |
| Placeholder | `placeholder-slate-400` | `dark:placeholder-slate-500` |

**Recommended class:**
```css
.input-field {
  @apply w-full px-3 py-2 rounded-lg
    bg-white dark:bg-slate-700
    border border-slate-300 dark:border-slate-600
    text-slate-900 dark:text-white
    placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2
    focus:ring-primary-500/20 dark:focus:ring-primary-400/20
    focus:border-primary-500 dark:focus:border-primary-400;
}
```

### Labels

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Primary label | `text-slate-700` | `dark:text-slate-200` |
| Secondary label | `text-slate-600` | `dark:text-slate-300` |
| Help text | `text-slate-500` | `dark:text-slate-400` |
| Error text | `text-red-600` | `dark:text-red-400` |

### Select Dropdowns

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Background | `bg-white` | `dark:bg-slate-700` |
| Border | `border-slate-300` | `dark:border-slate-600` |
| Text | `text-slate-900` | `dark:text-white` |
| Option (hover) | `bg-slate-100` | `dark:bg-slate-600` |

### Checkboxes & Radios

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Unchecked bg | `bg-white` | `dark:bg-slate-700` |
| Unchecked border | `border-slate-300` | `dark:border-slate-500` |
| Checked bg | `bg-primary-500` | `dark:bg-primary-500` |
| Checked border | `border-primary-500` | `dark:border-primary-500` |

---

## Buttons

### Primary Button

| State | Light Classes | Dark Classes |
|-------|---------------|--------------|
| Default | `bg-primary-500 text-white` | Same |
| Hover | `hover:bg-primary-600` | Same |
| Active | `active:bg-primary-700` | Same |
| Disabled | `disabled:bg-primary-300 disabled:cursor-not-allowed` | Same |

### Secondary Button

| State | Light Classes | Dark Classes |
|-------|---------------|--------------|
| Default | `bg-slate-100 text-slate-700` | `dark:bg-slate-700 dark:text-slate-300` |
| Hover | `hover:bg-slate-200` | `dark:hover:bg-slate-600` |
| Active | `active:bg-slate-300` | `dark:active:bg-slate-500` |

### Ghost Button

| State | Light Classes | Dark Classes |
|-------|---------------|--------------|
| Default | `text-slate-600` | `dark:text-slate-400` |
| Hover | `hover:bg-slate-100` | `dark:hover:bg-slate-700` |
| Active | `active:bg-slate-200` | `dark:active:bg-slate-600` |

### Danger Button

| State | Light Classes | Dark Classes |
|-------|---------------|--------------|
| Default | `bg-red-500 text-white` | Same |
| Hover | `hover:bg-red-600` | Same |
| Active | `active:bg-red-700` | Same |

---

## Modal

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Backdrop | `backdrop:bg-black/50` | Same |
| Container | `bg-white` | `dark:bg-slate-800` |
| Header border | `border-slate-200` | `dark:border-slate-700` |
| Title | `text-slate-900` | `dark:text-white` |
| Close button (hover) | `hover:bg-slate-100` | `dark:hover:bg-slate-700` |
| Close icon | `text-slate-500` | Same |

---

## Status Badges

### Stage Badges (Propagation)

| Stage | Light BG | Light Text | Dark BG | Dark Text |
|-------|----------|------------|---------|-----------|
| Taken | `bg-blue-100` | `text-blue-800` | `dark:bg-blue-900/30` | `dark:text-blue-200` |
| Rooting | `bg-yellow-100` | `text-yellow-800` | `dark:bg-yellow-900/30` | `dark:text-yellow-200` |
| Rooted | `bg-green-100` | `text-green-800` | `dark:bg-green-900/30` | `dark:text-green-200` |
| Potted Up | `bg-teal-100` | `text-teal-800` | `dark:bg-teal-900/30` | `dark:text-teal-200` |
| Hardening | `bg-orange-100` | `text-orange-800` | `dark:bg-orange-900/30` | `dark:text-orange-200` |
| Ready | `bg-purple-100` | `text-purple-800` | `dark:bg-purple-900/30` | `dark:text-purple-200` |
| Graduated | `bg-emerald-100` | `text-emerald-800` | `dark:bg-emerald-900/30` | `dark:text-emerald-200` |
| Failed | `bg-red-100` | `text-red-800` | `dark:bg-red-900/30` | `dark:text-red-200` |

### Alert Badges

| Type | Light Classes | Dark Classes |
|------|---------------|--------------|
| Overdue Alert | `bg-orange-500 text-white` | Same |
| Ready Alert | `bg-green-600 text-white` | Same |
| Info Badge | `bg-blue-100 text-blue-700` | `dark:bg-blue-900/30 dark:text-blue-300` |

---

## Charts & Data Visualization

### Chart Colors

| Purpose | Light Mode | Dark Mode | Notes |
|---------|------------|-----------|-------|
| Primary series | `#22c55e` | `#4ade80` | Slightly lighter in dark |
| Secondary series | `#3b82f6` | `#60a5fa` | Blue accent |
| Tertiary series | `#a855f7` | `#c084fc` | Purple accent |
| Grid lines | `#e2e8f0` | `#334155` | Subtle grid |
| Axis text | `#64748b` | `#94a3b8` | Muted |
| Tooltip bg | `#ffffff` | `#1e293b` | Matches surface |

### Success Rate Indicators

| Range | Color | Usage |
|-------|-------|-------|
| >= 80% | `text-green-600 dark:text-green-400` | Excellent |
| >= 50% | `text-yellow-600 dark:text-yellow-400` | Moderate |
| < 50% | `text-red-600 dark:text-red-400` | Poor |

---

## Empty States

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Container | `bg-slate-50` | `dark:bg-slate-800/50` |
| Icon | `text-slate-300` | `dark:text-slate-600` |
| Title | `text-slate-700` | `dark:text-slate-300` |
| Description | `text-slate-500` | `dark:text-slate-400` |

---

## Loading States

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Skeleton bg | `bg-slate-200` | `dark:bg-slate-700` |
| Spinner | `text-primary-500` | `dark:text-primary-400` |
| Backdrop | `bg-white/80` | `dark:bg-slate-900/80` |

**Skeleton animation:**
```css
.skeleton {
  @apply bg-slate-200 dark:bg-slate-700 animate-pulse rounded;
}
```

---

## Tabs

| Element | Light Classes | Dark Classes |
|---------|---------------|--------------|
| Container bg | `bg-slate-100` | `dark:bg-slate-800` |
| Tab (inactive) | `text-slate-600` | `dark:text-slate-400` |
| Tab (hover) | `text-slate-800` | `dark:text-slate-200` |
| Tab (active) bg | `bg-white` | `dark:bg-slate-700` |
| Tab (active) text | `text-slate-900` | `dark:text-white` |
| Tab (active) shadow | `shadow-sm` | Same |

---

## Component Utility Classes

Add these reusable classes to your CSS:

```css
/* Utility classes for consistent theming */

/* Text utilities */
.text-heading {
  @apply text-slate-900 dark:text-white;
}

.text-body {
  @apply text-slate-700 dark:text-slate-300;
}

.text-caption {
  @apply text-slate-500 dark:text-slate-400;
}

/* Surface utilities */
.surface-primary {
  @apply bg-white dark:bg-slate-800;
}

.surface-secondary {
  @apply bg-slate-50 dark:bg-slate-700;
}

/* Border utilities */
.border-subtle {
  @apply border-slate-200 dark:border-slate-700;
}

.border-emphasis {
  @apply border-slate-300 dark:border-slate-600;
}

/* Card base */
.card {
  @apply bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm;
}

/* Interactive surface */
.surface-interactive {
  @apply bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors;
}
```

---

## Migration Checklist

When updating a component to support dark mode:

1. [ ] Replace hardcoded colors with semantic classes
2. [ ] Add `dark:` variants for all color properties
3. [ ] Test in both light and dark modes
4. [ ] Verify contrast ratios meet WCAG AA
5. [ ] Check interactive states (hover, focus, active)
6. [ ] Validate shadows and borders are visible in both modes
7. [ ] Ensure icons remain visible and legible
