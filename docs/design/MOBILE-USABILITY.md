# Paddock Mobile Usability Assessment

## Overview

This document evaluates Paddock's mobile usability, focusing on touch targets, breakpoint behavior, gesture opportunities, and field-use considerations for farmers using the app with gloves, in sunlight, or in challenging conditions.

---

## 1. Touch Target Analysis

### Minimum Standard: 44x44px (Apple HIG) / 48x48dp (Material Design)

### Navigation Elements

| Element | Size | Compliant | Notes |
|---------|------|-----------|-------|
| BottomNav items | `h-16` (64px), full width | Yes | Touch target spans entire nav item |
| BottomNav icons | `w-6 h-6` (24px) | - | Icon visual, touch target is larger |
| TopNav module tabs | `px-3 py-2` | Yes | ~44px height with padding |
| ModuleNav items | `px-4 py-2` | Yes | ~44px height |
| Modal close button | `min-h-[44px] min-w-[44px]` | Yes | Explicit minimum |

### Card Actions

| Element | Size | Compliant | Notes |
|---------|------|-----------|-------|
| TrayCard buttons | `px-3 py-2` | Borderline | ~36px height, needs increase |
| BatchCard buttons | `min-h-[44px] px-3 py-2` | Yes | Explicit minimum set |
| SiteCard buttons | `px-3 py-1.5` | No | ~32px height |
| StationCard buttons | `px-3 py-2` | Borderline | ~36px height |
| MotherPlantCard buttons | `px-3 py-2` | Borderline | ~36px height |

### Form Elements

| Element | Size | Compliant | Notes |
|---------|------|-----------|-------|
| Text inputs | `px-3 py-2` | Yes | ~44px with default styling |
| Select dropdowns | `px-3 py-2` | Yes | ~44px height |
| Checkboxes | `w-5 h-5` (20px) | No | Needs wrapper or increase |
| Quick weight buttons | `px-3 py-1.5` | No | ~32px height |
| Filter pills | `px-3 py-1.5` | No | ~32px height |
| Form submit buttons | `px-4 py-2.5` | Yes | ~44px height |

### Global CSS Touch Target

The app includes this CSS in `index.css`:
```css
button, a, input[type="checkbox"], input[type="radio"], select {
  min-height: 44px;
}
```

**Issue:** This global rule may not apply to all elements due to specificity or display type.

### Recommendations

1. **Add explicit `min-h-[44px]` to all card action buttons** (TrayCard, SiteCard, StationCard, MotherPlantCard)
2. **Increase quick select button height** from `py-1.5` to `py-2` minimum
3. **Wrap checkboxes in larger touch target** container
4. **Filter pills need larger touch areas** - consider `py-2` minimum

---

## 2. Mobile Breakpoint Behavior

### Responsive Patterns Used

| Pattern | Breakpoint | Usage |
|---------|------------|-------|
| Mobile-first hiding | `sm:hidden` | BottomNav (hidden on desktop) |
| Desktop-only display | `hidden sm:flex` | TopNav module tabs |
| Grid column changes | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | Card grids |
| Padding adjustments | `p-4 md:p-6` | Module containers |
| Font size scaling | `text-lg sm:text-xl` | Modal titles |

### Current Breakpoints

| Breakpoint | Pixel Value | Usage |
|------------|-------------|-------|
| `sm` | 640px | Primary mobile/desktop split |
| `md` | 768px | Padding increases |
| `lg` | 1024px | Grid column increases |
| `xl` | 1280px | Max content width |

### Modal Behavior

```tsx
// Modal sizing classes
const mobileSizeClasses = 'w-full h-full sm:h-auto sm:max-h-[90vh] sm:my-4 sm:mx-auto sm:rounded-xl';
```

**Finding:** Modals go full-screen on mobile, centered on desktop. This is good for mobile usability.

### Grid Responsiveness

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| TrayList | 1 column | 2 columns | 3-4 columns |
| BatchList | 1 column | 2 columns | 3-4 columns |
| Metrics grid | 2 columns | 3 columns | 5 columns |
| Quick actions | 2 columns | 3 columns | 5 columns |

### Issues Identified

1. **Filter rows can overflow** - Status filter pills use `overflow-x-auto` but this is not obvious to users
2. **No swipe gestures** - Card grids don't support horizontal swiping
3. **Dense information** - Stats grids may be hard to read on small screens
4. **Form width** - Some forms don't constrain max-width on very large screens

### Recommendations

1. **Add scroll indicators** for horizontally scrollable filter rows
2. **Consider card stacking** on mobile instead of side-by-side
3. **Increase stat card font sizes** on mobile for readability
4. **Add max-w constraint** to form containers

---

## 3. Gesture Support Opportunities

### Current Gesture Support

| Gesture | Implementation | Notes |
|---------|----------------|-------|
| Tap | Native | All interactive elements |
| Scroll | Native | Vertical scrolling |
| Horizontal scroll | CSS `overflow-x-auto` | Filter pills only |

### Missing Gestures (Opportunities)

| Gesture | Use Case | Priority |
|---------|----------|----------|
| Swipe to delete | Quick tray/batch removal | Medium |
| Pull to refresh | Reload data (offline sync) | High |
| Long press | Quick actions menu | Low |
| Swipe between tabs | Module navigation | Medium |
| Pinch to zoom | Calendar/timeline views | Low |

### Recommendations

1. **Implement pull-to-refresh** for lists (critical for field use)
2. **Add swipe-to-reveal actions** on cards for quick status changes
3. **Consider swipe navigation** between site/module tabs

---

## 4. Field-Use Considerations

### Glove-Friendly Design

| Consideration | Current Status | Recommendation |
|---------------|----------------|----------------|
| Touch target size | Mixed (see above) | Increase all to 48px minimum |
| Button spacing | `gap-2` to `gap-3` | Increase to `gap-4` between actions |
| Input font size | Default | Increase to `text-lg` for fields |
| Error state visibility | Small red text | Add icon + larger text |

### Sunlight/Outdoor Visibility

| Consideration | Current Status | Recommendation |
|---------------|----------------|----------------|
| Contrast ratios | Good (slate palette) | Verify WCAG AA on all elements |
| Dark mode | Implemented | Add auto-switch option for time of day |
| Icon visibility | Emoji (render well) | Good choice for outdoor use |
| Status colors | Semantic (green/yellow/red) | Consider high-contrast mode |

### Quick Data Entry

| Pattern | Current Status | Recommendation |
|---------|----------------|----------------|
| Quick select buttons | Implemented | Add more presets |
| Voice input | Not implemented | Consider for notes fields |
| Photo capture | Not implemented | Priority for future |
| Barcode/QR | Not implemented | Consider for tray tracking |

### Offline Capability

| Feature | Current Status | Notes |
|---------|----------------|-------|
| Data storage | IndexedDB (Dexie) | Good - works offline |
| PWA support | Implemented | Installable |
| Sync indication | Not visible | Add sync status indicator |
| Offline mode banner | Not implemented | Add when offline |

---

## 5. Mobile-Specific UI Issues

### Issue 1: BottomNav Only Shows Grow Module Items

The mobile BottomNav hardcodes Grow module navigation items:
```tsx
const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/grow', ... },
  { name: 'Trays', path: '/grow/trays', ... },
  // etc.
];
```

**Problem:** Users in Propagation module have no mobile navigation.

**Recommendation:** Make BottomNav context-aware, showing items for current module.

### Issue 2: Module Switching on Mobile

**Problem:** TopNav is hidden on mobile, but modules are listed there. Users need to scroll up to see ModuleNav which doesn't show all modules.

**Recommendation:** Add module switcher to BottomNav or as a slide-out drawer.

### Issue 3: Form Scrolling in Modals

**Problem:** Long forms in modals may have scrolling issues on iOS Safari.

**Recommendation:** Test on physical iOS devices; consider `-webkit-overflow-scrolling: touch`.

### Issue 4: Keyboard Handling

**Problem:** When keyboard appears, BottomNav may overlap input fields.

**Recommendation:** Hide BottomNav when keyboard is visible or add scroll-into-view behavior.

---

## 6. PWA-Specific Considerations

### Current PWA Features

| Feature | Status | Notes |
|---------|--------|-------|
| Service worker | Enabled | Via vite-plugin-pwa |
| Manifest | Present | Installable |
| Safe area support | Partial | `.safe-bottom` class defined |
| Standalone mode | Supported | Full-screen when installed |

### Safe Area Implementation

```css
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

**Applied to:** BottomNav

**Missing from:** Modal footer, form buttons (may be obscured by home indicator on iPhone)

### Recommendations

1. **Add safe-area-inset-top** support for notched devices
2. **Apply safe-bottom** to modal action areas
3. **Test on iPhone with home indicator**

---

## 7. Accessibility on Mobile

### Screen Reader Support

| Feature | Status | Notes |
|---------|--------|-------|
| Semantic HTML | Good | Using `<nav>`, `<main>`, `<button>` |
| ARIA labels | Partial | Modal close has `sr-only` label |
| Focus management | Basic | No focus trap in modals (uses native `<dialog>`) |
| Tab navigation | Working | Uses native `<dialog>` behavior |

### Recommendations

1. **Add aria-labels** to icon-only buttons
2. **Ensure focus visible** states are prominent enough outdoors
3. **Test with VoiceOver/TalkBack**

---

## Priority Improvements for Mobile

### High Priority (Immediate)

1. **Increase touch targets** on card action buttons (add `min-h-[44px]`)
2. **Context-aware BottomNav** that changes per module
3. **Pull-to-refresh** for data freshness
4. **Offline indicator** to show sync status

### Medium Priority (Next Sprint)

5. **Swipe actions** on cards for quick status changes
6. **Safe area support** for modal footers
7. **Filter scroll indicator** for horizontal overflow
8. **Larger input text** for field readability

### Lower Priority (Future)

9. **Voice input** for notes
10. **Camera integration** for photos
11. **High-contrast mode** for outdoor use
12. **Haptic feedback** for confirmations
