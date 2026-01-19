# Paddock Design Tokens

## Overview

This document defines the semantic color tokens for Paddock's light and dark themes. These tokens create a consistent visual language across all modules (Grow, Propagation, and future modules).

**Design Considerations for Field Use:**
- Light mode optimized for bright sunlight readability
- Dark mode optimized for low-light conditions (early morning, evening, indoor)
- High contrast ratios for outdoor visibility
- Reduced blue light in dark mode for eye comfort

---

## Token Architecture

### Naming Convention

Tokens follow a semantic naming pattern:
```
--color-{category}-{variant}
```

Categories:
- `bg` - Background colors
- `surface` - Elevated surfaces (cards, modals)
- `text` - Typography colors
- `border` - Border and divider colors
- `accent` - Primary brand/action colors
- `status` - Semantic status indicators
- `grade` - Quality grade indicators (microgreens-specific)
- `stage` - Propagation stage indicators

---

## Core Semantic Tokens

### Background & Surface

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-bg-primary` | `#fafafa` | `#0f172a` | App background |
| `--color-bg-secondary` | `#f1f5f9` | `#1e293b` | Secondary background |
| `--color-surface-primary` | `#ffffff` | `#1e293b` | Cards, modals, elevated content |
| `--color-surface-secondary` | `#f8fafc` | `#334155` | Nested surfaces, input backgrounds |
| `--color-surface-elevated` | `#ffffff` | `#475569` | Popovers, dropdowns, tooltips |

### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-text-primary` | `#1e293b` | `#f1f5f9` | Primary text, headings |
| `--color-text-secondary` | `#475569` | `#cbd5e1` | Secondary text, labels |
| `--color-text-muted` | `#64748b` | `#94a3b8` | Tertiary text, placeholders |
| `--color-text-inverted` | `#ffffff` | `#0f172a` | Text on colored backgrounds |

### Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-border-primary` | `#e2e8f0` | `#334155` | Card borders, dividers |
| `--color-border-secondary` | `#cbd5e1` | `#475569` | Input borders, focus rings |
| `--color-border-focus` | `#22c55e` | `#4ade80` | Focus state rings |

---

## Brand & Accent Colors

### Primary (Growth Green)

The primary color represents growth, vitality, and the farming context.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-accent-50` | `#f0fdf4` | `#052e16` | Subtle backgrounds |
| `--color-accent-100` | `#dcfce7` | `#14532d` | Hover backgrounds |
| `--color-accent-200` | `#bbf7d0` | `#166534` | Selected backgrounds |
| `--color-accent-500` | `#22c55e` | `#22c55e` | Primary actions |
| `--color-accent-600` | `#16a34a` | `#4ade80` | Hover state |
| `--color-accent-700` | `#15803d` | `#86efac` | Active state |
| `--color-accent-text` | `#15803d` | `#86efac` | Accent text on surfaces |

---

## Status Colors

### Semantic Status

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-status-success-bg` | `#dcfce7` | `#14532d` | Success backgrounds |
| `--color-status-success-text` | `#166534` | `#86efac` | Success text |
| `--color-status-success-border` | `#86efac` | `#22c55e` | Success borders |
| `--color-status-warning-bg` | `#fef3c7` | `#451a03` | Warning backgrounds |
| `--color-status-warning-text` | `#92400e` | `#fcd34d` | Warning text |
| `--color-status-warning-border` | `#fcd34d` | `#f59e0b` | Warning borders |
| `--color-status-error-bg` | `#fee2e2` | `#450a0a` | Error backgrounds |
| `--color-status-error-text` | `#991b1b` | `#fca5a5` | Error text |
| `--color-status-error-border` | `#fca5a5` | `#ef4444` | Error borders |
| `--color-status-info-bg` | `#dbeafe` | `#1e3a5f` | Info backgrounds |
| `--color-status-info-text` | `#1e40af` | `#93c5fd` | Info text |
| `--color-status-info-border` | `#93c5fd` | `#3b82f6` | Info borders |

### Overdue/Attention

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-attention-bg` | `#fff7ed` | `#431407` | Attention-needed background |
| `--color-attention-text` | `#c2410c` | `#fdba74` | Attention text |
| `--color-attention-border` | `#fdba74` | `#f97316` | Attention borders |

---

## Module-Specific Tokens

### Grow Module: Tray Status

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-tray-blackout-bg` | `#1e293b` | `#1e293b` | Blackout tray background |
| `--color-tray-blackout-text` | `#ffffff` | `#ffffff` | Blackout tray text |
| `--color-tray-light-bg` | `#fef9c3` | `rgba(234,179,8,0.2)` | Light phase background |
| `--color-tray-light-text` | `#713f12` | `#fef08a` | Light phase text |
| `--color-tray-harvested-bg` | `#dcfce7` | `rgba(34,197,94,0.2)` | Harvested background |
| `--color-tray-harvested-text` | `#166534` | `#86efac` | Harvested text |
| `--color-tray-failed-bg` | `#fee2e2` | `rgba(239,68,68,0.2)` | Failed background |
| `--color-tray-failed-text` | `#991b1b` | `#fca5a5` | Failed text |

### Grow Module: Quality Grades

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-grade-a` | `#22c55e` | `#22c55e` | Grade A |
| `--color-grade-b` | `#eab308` | `#eab308` | Grade B |
| `--color-grade-c` | `#f97316` | `#f97316` | Grade C |
| `--color-grade-f` | `#ef4444` | `#ef4444` | Grade F |

### Propagation Module: Stage Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-stage-taken-bg` | `#dbeafe` | `rgba(59,130,246,0.3)` | Taken stage |
| `--color-stage-taken-text` | `#1e40af` | `#93c5fd` | Taken text |
| `--color-stage-rooting-bg` | `#fef3c7` | `rgba(234,179,8,0.3)` | Rooting stage |
| `--color-stage-rooting-text` | `#92400e` | `#fcd34d` | Rooting text |
| `--color-stage-rooted-bg` | `#dcfce7` | `rgba(34,197,94,0.3)` | Rooted stage |
| `--color-stage-rooted-text` | `#166534` | `#86efac` | Rooted text |
| `--color-stage-potted-bg` | `#ccfbf1` | `rgba(20,184,166,0.3)` | Potted up stage |
| `--color-stage-potted-text` | `#115e59` | `#5eead4` | Potted text |
| `--color-stage-hardening-bg` | `#fed7aa` | `rgba(249,115,22,0.3)` | Hardening stage |
| `--color-stage-hardening-text` | `#9a3412` | `#fdba74` | Hardening text |
| `--color-stage-ready-bg` | `#e9d5ff` | `rgba(168,85,247,0.3)` | Ready stage |
| `--color-stage-ready-text` | `#6b21a8` | `#d8b4fe` | Ready text |
| `--color-stage-graduated-bg` | `#d1fae5` | `rgba(16,185,129,0.3)` | Graduated stage |
| `--color-stage-graduated-text` | `#065f46` | `#6ee7b7` | Graduated text |
| `--color-stage-failed-bg` | `#fee2e2` | `rgba(239,68,68,0.3)` | Failed stage |
| `--color-stage-failed-text` | `#991b1b` | `#fca5a5` | Failed text |

---

## Interactive States

### Button States

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-button-primary-bg` | `#22c55e` | `#22c55e` | Primary button |
| `--color-button-primary-hover` | `#16a34a` | `#16a34a` | Primary hover |
| `--color-button-primary-active` | `#15803d` | `#15803d` | Primary active |
| `--color-button-primary-text` | `#ffffff` | `#ffffff` | Primary text |
| `--color-button-secondary-bg` | `#f1f5f9` | `#334155` | Secondary button |
| `--color-button-secondary-hover` | `#e2e8f0` | `#475569` | Secondary hover |
| `--color-button-secondary-active` | `#cbd5e1` | `#64748b` | Secondary active |
| `--color-button-secondary-text` | `#334155` | `#e2e8f0` | Secondary text |

### Form Elements

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-input-bg` | `#ffffff` | `#1e293b` | Input background |
| `--color-input-border` | `#e2e8f0` | `#475569` | Input border |
| `--color-input-border-focus` | `#22c55e` | `#4ade80` | Focus border |
| `--color-input-text` | `#1e293b` | `#f1f5f9` | Input text |
| `--color-input-placeholder` | `#94a3b8` | `#64748b` | Placeholder text |

---

## CSS Custom Properties Implementation

Add to `src/index.css`:

```css
@theme {
  /* Semantic tokens - Light mode defaults */
  --color-bg-primary: #fafafa;
  --color-bg-secondary: #f1f5f9;
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f8fafc;
  --color-text-primary: #1e293b;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-border-primary: #e2e8f0;
  --color-border-secondary: #cbd5e1;

  /* Existing primary color scale */
  --color-primary-50: #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-300: #86efac;
  --color-primary-400: #4ade80;
  --color-primary-500: #22c55e;
  --color-primary-600: #16a34a;
  --color-primary-700: #15803d;
  --color-primary-800: #166534;
  --color-primary-900: #14532d;
}

/* Dark mode overrides */
.dark {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-surface-primary: #1e293b;
  --color-surface-secondary: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #94a3b8;
  --color-border-primary: #334155;
  --color-border-secondary: #475569;
}
```

---

## Token Migration Strategy

### Phase 1: Parallel Operation
- Keep existing Tailwind utility classes
- Add CSS custom properties for new components
- Both systems work together

### Phase 2: Gradual Migration
- Update components to use semantic tokens
- Replace hardcoded `dark:` variants with token-based approach
- Test each component in both modes

### Phase 3: Full Token System
- All colors reference semantic tokens
- Single source of truth for theming
- Easy to add new themes (high contrast, etc.)

---

## Hex Color Reference

### Light Mode Palette

```
Backgrounds:
  Primary:   #fafafa (near-white)
  Secondary: #f1f5f9 (light slate)
  Surface:   #ffffff (pure white)

Text:
  Primary:   #1e293b (slate-800)
  Secondary: #475569 (slate-600)
  Muted:     #64748b (slate-500)

Borders:
  Primary:   #e2e8f0 (slate-200)
  Secondary: #cbd5e1 (slate-300)

Accent:
  Primary:   #22c55e (green-500)
  Hover:     #16a34a (green-600)
  Active:    #15803d (green-700)
```

### Dark Mode Palette

```
Backgrounds:
  Primary:   #0f172a (slate-900)
  Secondary: #1e293b (slate-800)
  Surface:   #1e293b (slate-800)

Text:
  Primary:   #f1f5f9 (slate-100)
  Secondary: #cbd5e1 (slate-300)
  Muted:     #94a3b8 (slate-400)

Borders:
  Primary:   #334155 (slate-700)
  Secondary: #475569 (slate-600)

Accent:
  Primary:   #22c55e (green-500)
  Hover:     #4ade80 (green-400)
  Text:      #86efac (green-300)
```
