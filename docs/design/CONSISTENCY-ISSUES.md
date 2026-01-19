# Paddock Consistency Issues

## Overview

This document identifies UI/UX inconsistencies across the Paddock application, comparing patterns between the Grow and Propagation modules, as well as shared components.

---

## 1. Spacing Inconsistencies

### Card Padding

| Location | Padding | Expected |
|----------|---------|----------|
| TrayCard | `p-4` | Standard |
| BatchCard | `p-4` | Standard |
| SiteCard | `p-4` | Standard |
| StationCard | `p-4` | Standard |
| MetricCard (GrowDashboard) | `p-4` | Standard |
| QuickActionButton (Grow) | `p-4` | Standard |
| QuickActionButton (Prop) | `p-3 sm:p-4` | **Inconsistent** - responsive variant |

**Recommendation:** Standardize all cards to `p-4` with consistent responsive breakpoints.

### Section Spacing

| Location | Gap | Notes |
|----------|-----|-------|
| GrowDashboard sections | `space-y-6` | Standard |
| PropDashboard sections | `space-y-6` | Standard |
| Settings sections | `space-y-6` | Standard |
| Form sections | `space-y-5` | **Different from dashboard** |
| Modal content | `space-y-5` | Matches forms |

**Recommendation:** Standardize to `space-y-6` for sections, `space-y-4` for form fields.

### Module Container Padding

| Location | Padding | Notes |
|----------|---------|-------|
| GrowModule | `p-4 md:p-6` | Standard |
| PropagationModule | `p-4 md:p-6` | Standard |
| SettingsModule | `p-6` | **No responsive** - always p-6 |
| LandingPage | `px-4 py-16 md:py-24` | Different pattern |

**Recommendation:** Standardize module wrappers to `p-4 md:p-6`.

---

## 2. Typography Variations

### Page Titles

| Location | Classes | Size |
|----------|---------|------|
| GrowDashboard h1 | `text-2xl font-bold` | 24px |
| PropDashboard h1 | `text-2xl font-bold` | 24px |
| TrayList h1 | `text-2xl font-bold` | 24px |
| BatchList h1 | `text-2xl font-bold` | 24px |
| Settings h1 | `text-2xl font-bold` | 24px |
| Landing h1 | `text-4xl md:text-5xl lg:text-6xl` | Responsive |

**Finding:** Page titles are consistent within app, but landing page uses different scale.

### Section Headers

| Location | Classes | Notes |
|----------|---------|-------|
| Dashboard cards | `text-lg font-semibold` | Standard |
| Form sections | `text-lg font-medium` | **semibold vs medium** |
| NewBatchForm sections | `text-sm font-semibold uppercase tracking-wide` | Different style |

**Recommendation:** Standardize to `text-lg font-semibold` for card headers, `text-sm font-semibold uppercase tracking-wide` only for form section dividers.

### Label Text

| Location | Classes | Notes |
|----------|---------|-------|
| Form labels | `text-sm font-medium text-slate-700 dark:text-slate-300` | Standard |
| Stat labels | `text-xs text-slate-500 dark:text-slate-400` | Smaller |
| Badge text | `text-xs font-medium` | Standard |

**Finding:** Labels are mostly consistent.

---

## 3. Color Usage Differences

### Primary Button Styles

| Location | Classes | Notes |
|----------|---------|-------|
| NewTrayForm submit | `bg-primary-500 hover:bg-primary-600` | Standard |
| NewBatchForm submit | `bg-primary-500 hover:bg-primary-600` | Standard |
| EmptyState action | `btn btn-primary` | **Uses utility class** |
| DailyLogForm submit | `btn btn-primary` | Uses utility class |
| LandingPage CTA | `bg-primary-600 hover:bg-primary-700` | **600 instead of 500** |

**Issue:** Mixed use of utility classes (`btn btn-primary`) vs inline Tailwind. The `.btn` class is not defined in the codebase.

**Recommendation:** Either define `.btn` utilities in CSS or standardize to inline Tailwind classes throughout.

### Status Colors

| Status | Grow Module | Propagation Module |
|--------|-------------|-------------------|
| Active/Good | `bg-green-*` | `bg-green-*` |
| Warning/Caution | `bg-yellow-*` / `bg-amber-*` | `bg-yellow-*` / `bg-amber-*` |
| Danger/Failed | `bg-red-*` | `bg-red-*` |
| Neutral/Inactive | `bg-slate-*` | `bg-slate-*` |
| Info/Location | `bg-blue-*` | `bg-blue-*` / `bg-purple-*` (indoor) |

**Issue:** Indoor stations use `bg-purple-*` but indoor sites use standard styling.

**Recommendation:** Standardize indoor indicator colors across modules.

### Alert/Warning Colors

| Type | Classes Used | Location |
|------|--------------|----------|
| Overdue alert | `bg-orange-500 text-white` | TrayCard, BatchCard |
| Ready alert | `bg-green-600 text-white` | TrayCard |
| Action needed banner | `bg-orange-50 border-orange-300` | GrowDashboard, PropDashboard |

**Finding:** Alert colors are consistent between modules.

---

## 4. Button/Control Styling Differences

### Primary Actions

| Location | Pattern | Size |
|----------|---------|------|
| Card actions (Grow) | `px-3 py-2 rounded-lg` | Standard |
| Card actions (Prop) | `px-3 py-2 rounded-lg` | Standard |
| Form submit | `px-4 py-2.5 rounded-lg` | Slightly larger |
| Quick actions | `p-4 rounded-lg` | Larger tap target |
| Landing CTA | `px-8 py-4 rounded-xl` | Hero size |

**Issue:** Button sizes vary by context but not consistently.

**Recommendation:** Define size variants: `sm`, `md`, `lg` for buttons.

### Secondary/Cancel Buttons

| Location | Classes | Notes |
|----------|---------|-------|
| Modal cancel | `border border-slate-300 dark:border-slate-600` | Outline style |
| Card secondary | `bg-slate-100 dark:bg-slate-700` | Filled style |
| Confirm dialog cancel | `bg-slate-100 dark:bg-slate-700` | Filled style |

**Issue:** Modal cancel buttons use outline, other secondary buttons use filled.

**Recommendation:** Standardize secondary buttons to filled style (`bg-slate-100`).

### Status Filter Pills

| Module | Active State | Inactive State |
|--------|--------------|----------------|
| Grow (TrayList) | `bg-primary-500 text-white` | `bg-slate-100 dark:bg-slate-700` |
| Propagation (BatchList) | `bg-primary-500 text-white` | `bg-slate-100 dark:bg-slate-700` |

**Finding:** Filter pills are consistent.

---

## 5. Card Component Patterns

### Card Structure

| Component | Border | Shadow | Rounded |
|-----------|--------|--------|---------|
| TrayCard | `border-2` | `shadow-sm` | `rounded-xl` |
| BatchCard | `border-2` | `shadow-sm` | `rounded-xl` |
| SiteCard | `border-2` | `shadow-sm` | `rounded-xl` |
| StationCard | `border-2` | `shadow-sm` | `rounded-xl` |
| MotherPlantCard | `border-2` | `shadow-sm` | `rounded-xl` |
| MetricCard | none | `shadow-sm` | `rounded-xl` |
| Dashboard sections | none | `shadow-sm` | `rounded-xl` |

**Issue:** Data cards use `border-2`, container cards do not.

**Recommendation:** This is intentional - data cards have borders, container cards do not. Document this pattern.

### Card Action Areas

| Component | Separator | Pattern |
|-----------|-----------|---------|
| TrayCard | `border-t border-current/10` | Opacity-based |
| BatchCard | `border-t border-slate-200 dark:border-slate-700` | Explicit colors |
| SiteCard | `border-t border-slate-200 dark:border-slate-700` | Explicit colors |

**Issue:** TrayCard uses `border-current/10` while others use explicit colors.

**Recommendation:** Standardize to explicit colors for predictable dark mode behavior.

---

## 6. Icon Usage

### Icon Types

| Location | Type | Notes |
|----------|------|-------|
| TopNav modules | Emoji | Consistent |
| BottomNav items | SVG | Consistent |
| Card status | Emoji | Consistent |
| Form indicators | Emoji | Consistent |
| Action buttons | Emoji | Mixed with text |
| Badges | None/Emoji | Inconsistent |

**Issue:** Badges sometimes have icons, sometimes not.

**Recommendation:** Establish icon usage rules:
- Module/category indicators: Emoji
- Action icons: SVG or Emoji, pick one per context
- Status badges: Text only or with leading emoji

### Warning/Alert Icons

| Location | Icon | Notes |
|----------|------|-------|
| Overdue badges | `!` (text) | PropDashboard |
| Overdue badges | Emoji | GrowDashboard |
| Health alerts | Colored dot | MotherPlantCard |

**Issue:** Mixed representation of warning states.

**Recommendation:** Standardize to emoji for inline alerts, colored dots for status indicators.

---

## 7. Form Patterns

### Input Styling

| Form | Input Classes | Notes |
|------|---------------|-------|
| NewTrayForm | Full Tailwind inline | Verbose |
| NewBatchForm | Full Tailwind inline | Verbose |
| DailyLogForm | `className="input"` | **Uses utility class** |

**Issue:** DailyLogForm references `.input` class that may not be defined.

**Recommendation:** Define `.input` utility or convert to inline Tailwind.

### Quick Select Buttons

| Form | Pattern | Values |
|------|---------|--------|
| NewTrayForm (weights) | Inline selection | 50, 80, 100, 120 |
| NewBatchForm (quantity) | Inline selection | 5, 10, 20, 50, 100 |

**Finding:** Quick select pattern is consistent.

### Form Action Layout

| Form | Pattern |
|------|---------|
| NewTrayForm | `flex gap-3`, equal width buttons |
| NewBatchForm | `flex gap-3`, equal width buttons |
| DailyLogForm | `flex justify-end gap-3`, right-aligned |
| ConfirmDialog | `flex gap-3 justify-end`, right-aligned |

**Issue:** Modal forms use full-width buttons, standalone forms use right-aligned.

**Recommendation:** Establish pattern: modal forms = full-width, page forms = right-aligned.

---

## 8. Loading States

| Location | Pattern | Notes |
|----------|---------|-------|
| Dashboard loading | Text "Loading..." | Basic |
| List loading | Text "Loading trays..." | Contextual |
| DailyLogForm loading | Spinner | Animated |
| Submit loading | Text "Saving..." | Button text |
| ConfirmDialog loading | Spinner + "Processing..." | Rich |

**Issue:** Loading states vary in richness.

**Recommendation:** Standardize to:
- Page/section loading: Spinner with contextual text
- Button loading: Spinner + "Processing..." text

---

## 9. Empty States

| Location | Pattern | Has Action |
|----------|---------|------------|
| TrayList | Icon + title + description + CTA | Yes |
| BatchList | Icon + title + description + CTA | Yes |
| PropDashboard | Icon + title + description + CTA | Yes |
| GrowDashboard | Inline text | No |

**Issue:** Some empty states have CTAs, others just text.

**Recommendation:** All empty states should use `EmptyState` component with action button.

---

## Summary of Priority Issues

### High Priority (Functional Impact)

1. **Missing utility classes** (`.btn`, `.input`) - May cause runtime issues
2. **Card action border inconsistency** - Visual jarring in dark mode
3. **Loading state variance** - User confusion

### Medium Priority (Visual Polish)

4. **Button size variance** - No clear size system
5. **Secondary button style** - Outline vs filled
6. **Section spacing variance** - `space-y-5` vs `space-y-6`

### Low Priority (Cleanup)

7. **Indoor indicator colors** - Minor inconsistency
8. **Empty state patterns** - Some missing CTAs
9. **Icon usage rules** - Documentation needed
