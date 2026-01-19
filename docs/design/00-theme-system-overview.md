# Paddock Theme System - Design Overview

## Summary

This document provides a complete design specification for Paddock's Light/Dark/System theme system. The design builds upon the existing implementation while defining comprehensive design tokens, component mappings, and accessibility standards.

---

## Deliverables

| Document | Description |
|----------|-------------|
| [01-design-tokens.md](./01-design-tokens.md) | Complete semantic color token definitions for light and dark modes |
| [02-component-color-mappings.md](./02-component-color-mappings.md) | Token-to-component mappings for all UI elements |
| [03-system-preference-detection.md](./03-system-preference-detection.md) | OS preference detection strategy and enhancements |
| [04-theme-toggle-placement.md](./04-theme-toggle-placement.md) | Theme toggle UI placement recommendations |
| [05-contrast-verification.md](./05-contrast-verification.md) | WCAG AA contrast ratio verification for all color combinations |

---

## Current State Assessment

### Strengths

Paddock already has a solid foundation:

- **Theme hook exists:** `src/hooks/useTheme.ts` handles light/dark/system modes
- **Persistence works:** Preferences saved to IndexedDB via `platformDb.settings`
- **System detection works:** Uses `prefers-color-scheme` media query
- **Live updates work:** Listens for OS preference changes
- **Propagation components styled:** Dark mode already implemented for propagation module
- **Toggle UI exists:** Three-button selector in Settings > Preferences

### Gaps Identified

1. **Token inconsistency:** Colors defined inline as Tailwind classes, not semantic tokens
2. **Flash prevention:** No inline script to prevent theme flash on load
3. **Meta theme-color:** Browser chrome doesn't match theme
4. **Two minor contrast issues:** Dark mode placeholders and Grade B badge need fixes
5. **Incomplete coverage:** Some Grow module components may need dark mode attention

---

## Design Principles

### Field Use Optimization

Paddock is used by farmers in varying conditions:

1. **Bright sunlight:** Light mode with high contrast for outdoor readability
2. **Low light:** Dark mode with reduced blue light for early morning/evening use
3. **Gloved hands:** Large touch targets (44px minimum) already enforced
4. **Quick glances:** High contrast status indicators visible at a distance

### Color Philosophy

- **Growth Green (`#22c55e`)** as primary accent - represents vitality, farming context
- **Slate grays** for neutrals - professional, calming, high readability
- **Semantic colors** for status - green/yellow/red for success/warning/error
- **Consistent opacity patterns** - 30% opacity for dark mode backgrounds

---

## Implementation Priorities

### Phase 1: Quick Fixes (High Impact, Low Effort)

1. **Add flash prevention script to index.html**
   - Prevents white flash when loading dark mode
   - See [03-system-preference-detection.md](./03-system-preference-detection.md)

2. **Fix contrast issues**
   - Dark mode placeholder color: use `#94a3b8` instead of `#64748b`
   - Grade B badge: use `#a16207` instead of `#eab308`
   - See [05-contrast-verification.md](./05-contrast-verification.md)

3. **Add meta theme-color updates**
   - Update `<meta name="theme-color">` when theme changes
   - Light: `#fafafa`, Dark: `#0f172a`

### Phase 2: Token System (Medium Effort)

1. **Add CSS custom properties to index.css**
   - Define semantic tokens as documented in [01-design-tokens.md](./01-design-tokens.md)
   - Keep Tailwind classes working in parallel

2. **Add utility classes**
   - `.card`, `.text-heading`, `.surface-primary`, etc.
   - See [02-component-color-mappings.md](./02-component-color-mappings.md)

### Phase 3: Component Audit (Ongoing)

1. **Audit all components for dark mode support**
   - Use mapping document as checklist
   - Prioritize high-visibility components

2. **Add automated accessibility testing**
   - Integrate `@axe-core/react` in development
   - Add Storybook accessibility addon

---

## Key Decisions

### Theme Toggle Placement

**Decision:** Keep in Settings page only.

**Rationale:** Farmers set preferences once and leave them. A quick-access toggle adds complexity without proportional value. The "System" option handles most use cases automatically.

### Token Architecture

**Decision:** Use semantic naming with CSS custom properties.

**Example:**
- `--color-text-primary` rather than `--color-slate-900`
- `--color-surface-primary` rather than `--color-white`

**Rationale:** Semantic tokens make it clear what a color is for, not just what it is. Easier to maintain and extend.

### Dark Mode Strategy

**Decision:** Class-based switching with `.dark` on `<html>`.

**Rationale:** Aligns with Tailwind v4 configuration already in place. Enables JavaScript control while maintaining CSS-based styling.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User                                 │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Settings > Preferences                   │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │  │
│  │  │  Light  │  │  Dark   │  │ System  │               │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘               │  │
│  └───────┼────────────┼────────────┼────────────────────┘  │
│          └────────────┼────────────┘                        │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  useTheme Hook                        │  │
│  │  • Manages theme state                                │  │
│  │  • Detects system preference                          │  │
│  │  • Persists to IndexedDB + localStorage              │  │
│  │  • Applies .dark class to <html>                      │  │
│  │  • Updates <meta name="theme-color">                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  CSS Layer                            │  │
│  │  • index.css defines tokens in @theme                 │  │
│  │  • .dark {} overrides for dark mode                   │  │
│  │  • Tailwind dark: variants on components              │  │
│  └───────────────────────────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  UI Components                        │  │
│  │  • Use dark: variant classes                          │  │
│  │  • Follow component color mappings                    │  │
│  │  • Meet WCAG AA contrast requirements                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Contrast ratios | >= 4.5:1 (text), >= 3:1 (UI) | Automated axe testing |
| Theme flash | None visible | Manual testing on slow 3G |
| System preference response | < 100ms | Browser DevTools |
| Theme persistence | Survives refresh/close | Manual testing |
| Touch targets | >= 44px | CSS inspection |

---

## Related Files

| File | Purpose |
|------|---------|
| `src/hooks/useTheme.ts` | Theme state management |
| `src/index.css` | CSS tokens and base styles |
| `src/modules/settings/components/Preferences.tsx` | Theme toggle UI |
| `index.html` | Flash prevention script (to add) |
| `src/modules/propagation/utils/stageHelpers.ts` | Stage color definitions |
| `src/modules/grow/components/Trays/TrayCard.tsx` | Tray status colors |

---

## Next Steps

1. Review this design system documentation
2. Implement Phase 1 quick fixes
3. Test in both light and dark modes
4. Gather user feedback on readability in field conditions
5. Iterate based on real-world usage
