# Vegetable Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give vegetables the reference material microgreens and propagation already have —
a browsable library, and crop guidance surfaced where a planting is actually created.

**Architecture:** Follows the two existing guide systems exactly. Content is markdown on
disk under `public/guides/vegetables/`, described by an `index.json`, fetched and
fuzzy-matched by a hook. Guides are reference material rather than user data, so they ship
with the app and work offline without touching IndexedDB.

**Tech Stack:** TypeScript, React 19, Vite, Vitest.

---

## The gap being closed

| Layer | Microgreens | Propagation | Vegetables |
|---|---|---|---|
| Markdown content | 84 guides | 118 guides | **0** |
| `index.json` | ✅ | ✅ | — |
| Fetch/match hook | `useGrowingGuide` | `usePropagationGuide` | — |
| Library UI | `GuideLibrary` | `PropagationGuideLibrary` | — |
| Route | `/microgreens/guides` | `/propagation/guides` | — |
| Contextual panel | `GrowingGuidePanel` in the tray form | — | — |

The word "guide" appears nowhere in `src/modules/vegetables/`.

## Two decisions that shape the content

**1. Soil temperature leads; months follow.** Sowing dates are the least portable thing in
any growing guide and the most confidently wrong. Soil temperature is the actual signal a
seed responds to, and it holds anywhere. Every guide gives a germination temperature range
first, then a southern-hemisphere temperate sowing window as convenience.

**2. The guides say plainly that they are a starting point.** This app's data is Australian
— `Australia/Sydney`, and the demo history is Central Victoria — so the windows are written
for temperate southern Australia and labelled as such. A grower two hundred kilometres north
has a different calendar. The library says so rather than implying an authority the content
does not have.

Both of these exist because the alternative is a guide that reads authoritatively and sows
a crop a month early. That error surfaces a season later, when it cannot be undone.

## Metadata shape

Each module defines its own, suited to the job. Microgreens has `blackoutDays` and
`preSoak`; propagation has `bestMethod` and `timeToRoot`. Vegetables gets:

```ts
export interface VegetableGuideMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'moderate' | 'demanding';
  daysToMaturity: string;        // "60-80" - a range, because it is one
  sowingMethod: 'direct' | 'transplant' | 'either';
  spacingCm: number;             // between plants
  rowSpacingCm: number;
  sowingDepthMm: number;
  soilTempC: string;             // germination range, e.g. "10-30"
  successionDays: number | null; // null when it is not a succession crop
  file: string;
  status: string;
}
```

`successionDays` being nullable is deliberate and load-bearing: a bed of pumpkins is not a
succession crop, and offering an interval for one would be advice to do something silly.

## Categories and coverage — 58 crops

| Category | Crops |
|---|---|
| `leafy-greens` | Lettuce, Spinach, Silverbeet, Rocket, Mizuna, Tatsoi, Pak Choi, Mustard Greens, Endive, Radicchio, Corn Salad |
| `brassicas` | Broccoli, Cauliflower, Cabbage, Brussels Sprouts, Kohlrabi, Romanesco, Collards, Kale |
| `roots` | Carrot, Beetroot, Radish, Turnip, Parsnip, Swede, Daikon |
| `alliums` | Onion, Spring Onion, Leek, Garlic, Shallot |
| `legumes` | Pea, Snow Pea, Broad Bean, Bush Bean, Climbing Bean |
| `cucurbits` | Zucchini, Cucumber, Pumpkin, Squash, Rockmelon |
| `fruiting` | Tomato, Capsicum, Chilli, Eggplant, Potato |
| `herbs` | Basil, Coriander, Parsley, Dill, Chives, Mint, Thyme, Rosemary, Oregano, Sage |
| `perennials` | Asparagus, Rhubarb, Globe Artichoke |

---

### Task 1: Types, hook and index

**Files:** `src/lib/guides/vegetable-types.ts`, `src/lib/guides/useVegetableGuide.ts`,
`public/guides/vegetables/index.json`, plus tests.

- [ ] **Step 1** — `vegetable-types.ts` with `VegetableGuideMetadata`, `VegetableGuideCategory`
  and `VegetableGuideIndex`, mirroring `src/lib/guides/types.ts`.

- [ ] **Step 2** — `useVegetableGuide(cropName)` modelled on `useGrowingGuide`: fetch
  `/guides/vegetables/index.json`, cache it, fuzzy-match the crop name, fetch and cache the
  markdown. Include an alias table — a grower types "Silverbeet" where the guide is "Chard",
  "Zucchini" for "Courgette", "Capsicum" for "Bell Pepper", "Rocket" for "Arugula". Read
  `useGrowingGuide.ts` first and follow its shape rather than inventing a second one.

- [ ] **Step 3** — `public/guides/vegetables/index.json` with the nine categories and all 58
  guide entries, every one `"status": "stub"` initially. Content tasks flip them to
  `"complete"`.

- [ ] **Step 4** — Tests for the matcher: exact match, case-insensitive, alias, unknown crop
  returns null rather than throwing.

- [ ] **Step 5** — Verify and commit.

---

### Tasks 2-5: The content

Four batches, written against a single strict template so the library reads consistently.
These are independent and can run in parallel.

- [ ] **Task 2** — `leafy-greens` (11) and `brassicas` (8)
- [ ] **Task 3** — `roots` (7), `alliums` (5) and `legumes` (5)
- [ ] **Task 4** — `cucurbits` (5), `fruiting` (5) and `perennials` (3)
- [ ] **Task 5** — `herbs` (10)

Each guide follows this structure — roughly 110-150 lines, shorter than the microgreens
guides because a vegetable guide has less process and more judgement:

```markdown
# <Crop>

## Quick Facts
| Attribute | Value |          <- difficulty, days to maturity, sowing method, spacing,
                                  row spacing, depth, soil temp, succession interval

## Overview                       <- what it is, why grow it, what it is like to grow

## When to Sow
Soil temperature first, then a southern-hemisphere temperate window, then what
happens if you are early or late.

## Sowing
Direct or transplanted and why; depth; spacing and what crowding costs you.

## Growing On
Water, feeding, and the one or two things this crop actually needs.

## Harvest
When, how, and - for anything cut-and-come-again - how to keep it producing.

## Succession
Interval and how many sowings a season, or plainly that it is not a succession crop.

## Common Problems
Three, each with the symptom, the cause, and what to do.

## In the Bed
Rotation family, what follows it well, spacing in a bed rather than a row.
```

Rules for every guide:

- **Soil temperature before months, always.**
- Sowing windows are **temperate southern Australia**, and say so.
- Where a figure is genuinely variable, give a range rather than a false precision.
- No cultivar-specific claims unless the guide is about a cultivar.
- Plain prose. No marketing voice. The existing guides read like someone who grows things
  explaining it to someone who does not.

---

### Task 6: The library

**Files:** `src/modules/vegetables/components/Guides/{VegetableGuideLibrary,GuideDetailModal,index}.tsx`,
route, module nav entry, tests.

- [ ] Follow `src/modules/propagation/components/Guides/PropagationGuideLibrary.tsx` — it has
  the closest shape (categories, search, a detail modal).
- [ ] Add `/vegetables/guides` to the module routes and a "Guides" item to its nav.
- [ ] The library header carries the caveat: written for temperate southern Australia,
  a starting point rather than an authority.

---

### Task 7: The contextual panel

**Files:** `src/modules/vegetables/components/Plantings/CropGuidePanel.tsx`, wired into
`PlantingForm`.

This is the piece that earns the work. Microgreens surfaces `GrowingGuidePanel` inside the
tray form; propagation has only a library. For vegetables the contextual version matters
more — spacing, depth, soil temperature and succession interval are what you want in front
of you while filling in the planting form, not on a page you have to go and find.

- [ ] Panel shows the Quick Facts for the crop being typed, collapsed by default, with a link
  to the full guide.
- [ ] Matches on the form's `crop` field via `useVegetableGuide`, and renders nothing when
  there is no match — a grower sowing something unusual should not be nagged.

---

### Task 8: Sweep

- [ ] Every `index.json` entry has a file that exists, and every file is in the index
- [ ] `status` is `complete` for all 58
- [ ] `npm test`, `npm run build`, `npm run lint` at 63/22

## Done when

Opening `/vegetables/guides` browses 58 crops by category, and typing "Carrot" into the
planting form shows its spacing, depth and soil temperature without leaving the form.

## Not done here

- Guides for varieties within a crop. One guide per crop; cultivar differences are a note
  inside it.
- Any claim to authority. The content is a competent starting point that wants a grower's
  review against their own ground, and says so.
