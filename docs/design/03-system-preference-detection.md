# System Preference Detection Strategy

## Overview

Paddock already has a robust theme system implemented in `src/hooks/useTheme.ts`. This document reviews the current implementation, validates the approach, and recommends any improvements.

---

## Current Implementation Review

### Existing Hook: `useTheme.ts`

The current implementation already handles:

1. **Three theme modes**: `'light' | 'dark' | 'system'`
2. **System preference detection**: Uses `window.matchMedia('(prefers-color-scheme: dark)')`
3. **Persistence**: Saves to IndexedDB via `platformDb.settings`
4. **Live system updates**: Listens for media query changes
5. **Immediate application**: Adds/removes `.dark` class on `documentElement`

**Current Flow:**
```
1. Page Load
   ├── Load saved preference from IndexedDB
   ├── If 'system', check OS preference via matchMedia
   ├── Apply .dark class or remove it
   └── Set up listener for system preference changes

2. User Changes Theme
   ├── Update state immediately
   ├── Apply .dark class immediately
   └── Persist to IndexedDB (async)

3. System Preference Changes (when theme = 'system')
   ├── MediaQueryList 'change' event fires
   ├── Re-apply theme based on new preference
   └── Update resolvedTheme state
```

---

## Validation of Current Approach

### Strengths

| Feature | Status | Notes |
|---------|--------|-------|
| Class-based switching | Correct | Uses `.dark` class, matching Tailwind v4 config |
| System preference detection | Correct | `prefers-color-scheme` is well-supported |
| Persistence | Correct | IndexedDB is appropriate for PWA |
| Live updates | Correct | Responds to OS theme changes |
| Immediate feedback | Correct | No flash of wrong theme |
| Fallback handling | Correct | Defaults to 'system' on error |

### Browser Support

`prefers-color-scheme` is supported in:
- Chrome 76+ (July 2019)
- Firefox 67+ (May 2019)
- Safari 12.1+ (March 2019)
- Edge 79+ (January 2020)

**Coverage: ~97% of global users** (as of 2024)

---

## Recommended Improvements

### 1. Flash Prevention on Initial Load

**Issue:** There may be a brief flash of light theme before the saved preference loads from IndexedDB.

**Solution:** Add an inline script in `index.html` that runs before React hydrates:

```html
<!-- Add to <head> before any stylesheets -->
<script>
  (function() {
    // Check for saved preference in localStorage (fast sync access)
    var saved = localStorage.getItem('paddock-theme');

    if (saved === 'dark' ||
        ((!saved || saved === 'system') &&
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

**Why localStorage?** IndexedDB is async; localStorage is sync. Use both:
- localStorage for instant pre-render application
- IndexedDB as source of truth (synced after load)

**Hook update:**
```typescript
// In setTheme, also update localStorage
localStorage.setItem('paddock-theme', newTheme);
```

### 2. Meta Theme Color for PWA

**Purpose:** Match the browser chrome/status bar to the current theme.

**Add to `index.html`:**
```html
<meta name="theme-color" content="#fafafa" id="theme-color-meta" />
```

**Update in useTheme:**
```typescript
function applyTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  const root = document.documentElement;
  const meta = document.getElementById('theme-color-meta');
  const shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark);

  if (shouldBeDark) {
    root.classList.add('dark');
    meta?.setAttribute('content', '#0f172a'); // Dark bg color
    return 'dark';
  } else {
    root.classList.remove('dark');
    meta?.setAttribute('content', '#fafafa'); // Light bg color
    return 'light';
  }
}
```

### 3. Reduced Motion Consideration

Some users prefer reduced motion. When in dark mode at night, also consider reduced contrast preferences:

```typescript
// Additional media queries to consider
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersMoreContrast = window.matchMedia('(prefers-contrast: more)');
```

This is optional but shows attention to accessibility.

---

## Fallback Behavior

### When JavaScript is Disabled

The app requires JavaScript to function, but for progressive enhancement, CSS can provide a baseline:

```css
/* In index.css - apply system preference via CSS */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    /* Dark mode variables as fallback */
    --bg: #0f172a;
    --surface: #1e293b;
    --text: #f1f5f9;
  }
}
```

This is optional since Paddock is a JavaScript-heavy app.

### When IndexedDB is Unavailable

Current implementation handles this gracefully:
```typescript
} catch (error) {
  console.error('Failed to load theme:', error);
  // Apply system default
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = applyTheme('system', prefersDark);
  setResolvedTheme(resolved);
}
```

**Improvement:** Also try localStorage as fallback:
```typescript
} catch (error) {
  console.error('Failed to load theme from IndexedDB:', error);
  const fallback = localStorage.getItem('paddock-theme') as Theme | null;
  const savedTheme = fallback || 'system';
  // ...
}
```

---

## Detection Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Page Load                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Inline <script> checks localStorage + system pref       │
│     → Applies .dark class immediately (prevents flash)      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. React hydrates, useTheme hook runs                      │
│     → Loads preference from IndexedDB (async)               │
│     → Confirms/corrects initial class                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. MediaQueryList listener set up                          │
│     → Watches for OS preference changes                     │
│     → Only acts when theme = 'system'                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. User toggles theme                                      │
│     → Immediate UI update                                   │
│     → Sync to localStorage (instant)                        │
│     → Async write to IndexedDB (persistent)                 │
│     → Update <meta name="theme-color">                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Required (Current Implementation)
- [x] Three-mode support (light/dark/system)
- [x] System preference detection via `matchMedia`
- [x] Persistence to IndexedDB
- [x] Live system preference updates
- [x] Immediate application via class

### Recommended Enhancements
- [ ] Add inline script for flash prevention
- [ ] Mirror preference to localStorage for instant load
- [ ] Update `<meta name="theme-color">` dynamically
- [ ] Add localStorage fallback for IndexedDB failures

### Nice to Have
- [ ] Support `prefers-contrast: more` for high-contrast mode
- [ ] Add transition animations between themes
- [ ] Consider scheduling (auto-dark at sunset)

---

## Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| First visit, system = light | Light theme applied |
| First visit, system = dark | Dark theme applied |
| Return visit, saved = light | Light theme, no flash |
| Return visit, saved = dark | Dark theme, no flash |
| Return visit, saved = system, OS = dark | Dark theme applied |
| OS changes while app open, theme = system | Theme updates live |
| OS changes while app open, theme = light | No change (explicit preference) |
| IndexedDB unavailable | Falls back to localStorage or system |
| Both storage unavailable | Falls back to system preference |

---

## Related Files

| File | Purpose |
|------|---------|
| `src/hooks/useTheme.ts` | Theme management hook |
| `src/index.css` | Theme CSS variables and `.dark` variants |
| `src/modules/settings/components/Preferences.tsx` | Theme toggle UI |
| `index.html` | Inline script for flash prevention |
