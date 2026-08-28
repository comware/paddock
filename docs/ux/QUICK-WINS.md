# Grow module — UX review and quick wins

Reviewed 28 August 2026 against the live code. Every "Before" is a real value read from
the current source, not an approximation.

**Overall: 6.5 / 10.**

The module is visually consistent and the recent agent-facing work lifted feedback and
data-entry burden well above average. It is held back by an information architecture built
for a multi-site commercial operation, a workflow that breaks at its most important step,
and interactive elements that keyboard users cannot reach.

| Dimension | Score | Note |
|---|---|---|
| Visual design & consistency | 8 | Coherent cards, spacing, dark mode throughout |
| Feedback & system status | 8 | Toasts, badges, live updates, derived summaries |
| Data-entry burden | 8 | Daily log and time now derive rather than ask |
| Workflow coherence | **5** | The plan → tray step does not exist |
| Information architecture | **5** | Three nav levels, duplicated labels, single-site friction |
| Accessibility | **5** | Card grids unreachable by keyboard; 7 files with no focus styles |
| Clarity of language | 6 | "Decision", "Week 6", "Sites" |

---

# P0 — The workflow breaks where it matters most

## 1. A scheduled sowing cannot be sown

**Severity: critical.** This is the join between the two halves of the product.

`usePlannedPlantings` implements `convertToTray(id, trayId)`. Searching the whole UI:

```
$ grep -rn "convertToTray" src/modules --include=*.tsx
(no results)
```

**It is called from nowhere.** A grower — or an agent — can plan nine sowings, and on the
morning each one is due there is no way to say "done, here is the tray". They must open
Trays, click New Tray, and retype the variety, date and quantity that the plan already
holds. The planned sowing then sits in the calendar forever, permanently "due".

Every downstream feature inherits the break: `deriveDaySummary` will report the sowing as
overdue indefinitely, and `UpcomingWork` will keep showing it.

**Fix:** a primary action on `WorkDetail` for planned sowings.

```tsx
// WorkDetail.tsx — alongside the existing "Open tray" action
{subject.kind === 'planting' && subject.planting.status === 'planned' && onSowNow && (
  <button
    onClick={() => onSowNow(subject.planting)}
    className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
  >
    Sow this now
  </button>
)}
```

```tsx
// Handler: create the tray from the plan, then close the loop.
const handleSowNow = async (planting: GrowPlannedPlanting) => {
  const previous = lastUsed(trays, planting.variety);   // their own seed weight + medium
  const trayId = await addTray({
    siteId: planting.siteId,
    variety: planting.variety,
    dateSown: new Date(),
    seedWeight: previous?.seedWeight ?? 0,
    growingMedium: previous?.medium ?? 'coco_coir',
    blackoutDays: getVariety(planting.variety)?.defaultBlackoutDays ?? 4,
    preSoaked: getVariety(planting.variety)?.preSoakRequired ?? false,
  });
  await convertToTray(planting.id!, trayId);
  addToast(`Tray created for ${planting.variety}`, 'success');
};
```

**Rationale:** Nielsen #7, flexibility and efficiency — the system should let users act
where they encounter the work, not re-enter what it already knows.

---

## 2. Acting on the day's work takes 4 clicks across 3 screens

**Before —** "Harvest tray #23", starting from the site dashboard:

1. See it in Coming up
2. Click it → dialog
3. Click "Open tray" → tray list
4. Find #23, click Harvest
5. Fill the form

**After —** offer the action in the dialog, since the dialog already knows which tray:

```tsx
// WorkDetail.tsx
{subject.kind === 'tray' && subject.focus === 'harvest' && onHarvest && (
  <button
    onClick={() => onHarvest(subject.tray)}
    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
  >
    Harvest now
  </button>
)}
{subject.kind === 'tray' && subject.focus === 'light' && onMoveToLight && (
  <button
    onClick={() => onMoveToLight(subject.tray)}
    className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition-colors"
  >
    Move to light
  </button>
)}
```

Move-to-light needs no form at all — it is a single state change and should never have
required navigating anywhere.

**Result:** 5 steps → 2. "Open tray" stays for anyone who wants the full record.

---

# P1 — Information architecture

## 3. Three navigation levels for a one-greenhouse grower

**Before:**

```
TopNav        Grow · Guides · Settings
ModuleNav     Sites · Calendar · Analytics · Decision · Guides
SiteSubNav    Overview · Trays · Daily Log · Time · Analytics
```

Three problems:

- **"Analytics" appears twice** (module-level = cross-site, site-level = one site). They
  are visually identical and nothing tells you which you are in.
- **"Guides" appears twice** — TopNav and ModuleNav.
- **Scoping is inconsistent.** Calendar and Decision are module-level; Daily Log and Time
  are site-level. Nothing explains why.

**Fix (low effort):** with one site, skip the list.

```tsx
// SitesOverview.tsx — a list of one is a speed bump, not a choice
useEffect(() => {
  if (!isLoading && sites.length === 1) {
    navigate(`/grow/site/${sites[0].id}`, { replace: true });
  }
}, [isLoading, sites, navigate]);
```

Add "Sites" back to the site-level nav so multi-site users keep the route. `replace: true`
keeps the back button sane.

**Fix (medium effort):** drop duplicated labels — remove Guides from ModuleNav (TopNav has
it) and rename the module-level tab to "All sites" when more than one site exists.

## 4. "Decision" means nothing

**Before:** a top-level tab labelled **Decision**, whose page comment reads *"Week 6
decision scorecard"*.

Neither the label nor the content explains itself. It is an artefact of the original
six-week experiment framing, and a grower six months in has no week 6.

**Fix:** rename to **"Compare varieties"**, or fold it into Analytics as a fourth tab.
Recognition over recall (Nielsen #6).

## 5. The site dashboard has four overlapping sections

**Before:** Quick Actions · Coming up · Today · Recent Harvests.

"Quick Actions" (New Tray / Log Day / Log Time / Harvest) largely duplicates what "Coming
up" now surfaces *with context* — and Coming up knows *which* tray, where Quick Actions
does not.

**Fix:** demote Quick Actions to a single "＋ New tray" button in the header, and let
Coming up own the rest. Removes a row of four generic buttons that compete with a list of
specific ones.

---

# P2 — Accessibility (WCAG 2.2)

## 6. Card grids are unreachable by keyboard

**Before —** `TrayCard.tsx:90` and `SiteCard.tsx:31`:

```tsx
<div
  className="... cursor-pointer hover:shadow-md transition-shadow"
  onClick={() => onClick?.(tray.id!)}
>
```

A `div` with `onClick` is not focusable, not announced as interactive, and cannot be
activated by Enter or Space. The entire tray grid — the module's main working surface — is
keyboard-inaccessible. This fails **2.1.1 Keyboard (A)** and **4.1.2 Name, Role, Value (A)**.

**After:**

```tsx
<div className="relative rounded-xl p-4 ...">
  {/* Stretched-link pattern: the whole card is the target, and the nested
      Harvest / Move to light buttons stay independently focusable. */}
  <button
    type="button"
    onClick={() => onClick?.(tray.id!)}
    aria-label={`Tray ${tray.trayNumber}, ${tray.variety}, ${config.label}. Show details.`}
    className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
  />
  <div className="relative z-10 pointer-events-none">
    {/* card content */}
    <div className="pointer-events-auto">{/* action buttons */}</div>
  </div>
</div>
```

Nesting buttons inside a button is invalid HTML, so the stretched-link pattern is the
correct fix rather than making the card itself a `<button>`.

## 7. Seven components have no focus styles at all

```
$ grep -rc "focus:ring\|focus-visible" src/modules/grow/components/{Trays,Sites}/*.tsx | grep ':0'
GrowingGuidePanel.tsx:0   SiteDetailLayout.tsx:0   SiteDashboard.tsx:0
SiteCard.tsx:0            SitesOverview.tsx:0      SiteList.tsx:0
SiteSelector.tsx:0
```

Every interactive element in those files relies on the browser default, which Tailwind's
preflight removes. Fails **2.4.7 Focus Visible (AA)** and **2.4.11 Focus Appearance (AAA)**.

**Fix — one line, applies everywhere:**

```css
/* src/index.css */
@layer base {
  :where(a, button, [role="button"], summary, [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 2px solid theme('colors.primary.500');
    outline-offset: 2px;
    border-radius: theme('borderRadius.md');
  }
}
```

`:where()` keeps specificity at zero, so any component-level focus style still wins. This
single rule fixes all seven files and anything added later.

## 8. `SiteSubNav` icons are announced to screen readers

**Before —** `SiteDetailLayout.tsx:56`: `<span>{item.icon}</span>`

VoiceOver reads "bar chart Overview", "seedling Trays". `ModuleNav` was already fixed;
this one was missed.

**After:** `<span aria-hidden="true">{item.icon}</span>`

---

# P3 — Language

| Before | After | Why |
|---|---|---|
| Sites | Greenhouses / Locations | "Sites" is enterprise language for a backyard |
| Decision | Compare varieties | Says what it does |
| Week 6 Decision | Variety scorecard | A grower six months in has no week 6 |
| Log Day | Today's log | Matches the page it opens |
| Tray Counts | *(removed)* | Already done |

---

# Priority order

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | Sow a planned sowing from the dialog | **Critical** | S |
| 2 | Harvest / move to light from the dialog | High | S |
| 7 | Global `:focus-visible` rule | High | XS |
| 6 | Keyboard-accessible cards | High | M |
| 3 | Skip the site list when there is one site | Medium | XS |
| 8 | `aria-hidden` on SiteSubNav icons | Medium | XS |
| 4 | Rename "Decision" | Medium | XS |
| 5 | Demote Quick Actions | Medium | S |

Items 1, 2, 3, 7 and 8 together are roughly two hours and lift the score to about **8**.

---

# How to validate

- **Keyboard only:** Tab from the site dashboard to a tray and open it. Currently
  impossible; should take four Tab presses.
- **VoiceOver:** cards should announce as buttons with variety and status, not as text.
- **Click count:** harvesting a tray from the dashboard should be 2 steps, not 5.
- **Dead plans:** sow a planned sowing; it should leave "Coming up" and appear in Trays.
  Currently it can do neither.
