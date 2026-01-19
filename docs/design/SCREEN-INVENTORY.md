# Paddock Screen Inventory

## Overview

This document catalogs all screens and views in the Paddock application, organized by module.

---

## Landing Page

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Landing Page | `/` | Marketing/onboarding page for new users | Polished, standalone layout with hero, features, learning paths, getting started, and footer |

---

## Grow Module

### Sites Management

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Sites Overview | `/grow` | Landing page showing all sites with cards | Good - card grid layout with weather preview |
| Site List | `/grow/sites/manage` | Full site management with CRUD | Good - list with actions |
| Site Dashboard | `/grow/site/:siteId` | Individual site metrics and overview | Good - metrics grid with weather |

### Tray Management

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Tray List | `/grow/site/:siteId/trays` | Grid of tray cards with filters | Good - robust filtering, status pills |
| New Tray Form | Modal | Create new tray | Good - quick weights, variety selector |
| Edit Tray Form | Modal | Edit existing tray | Good - matches New Tray pattern |
| Harvest Form | Modal | Record harvest data | Good - quality grade selection |

### Daily Operations

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Daily Log Page | `/grow/site/:siteId/daily` | Daily observation entry | Good - mood slider, weather auto-fill |
| Log History | Component | View past daily logs | Good - tabular history |
| Time Tracking | `/grow/site/:siteId/time` | Track time spent on tasks | Good - task categories |

### Analytics & Decision

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Analytics Page | `/grow/analytics` | Cross-site analytics and trends | Good - CSS charts, progress bar |
| Decision Page | `/grow/decision` | Week 6 scorecard and recommendations | Good - questionnaire, scorecard |

### Calendar & Planning

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Planting Calendar | `/grow/calendar` | Calendar view of plantings | Good - timeline view |
| Pipeline Overview | Component | Upcoming harvest pipeline | Good - grouped by timeframe |
| Planned Planting Form | Modal | Schedule future planting | Good - date picker |

### Reference

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Guide Library | `/grow/guides` | Growing guides by variety | Good - searchable, markdown rendering |

---

## Propagation Module

### Dashboard & Overview

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Propagation Dashboard | `/propagation` | At-a-glance metrics and status | Good - metrics cards, stage distribution |
| Ready to Graduate | Component | Batches ready for advancement | Good - action buttons |
| Needing Attention | Component | Overdue batches | Good - alert styling |

### Batch Management

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Batch List | `/propagation/batches` | Grid of batch cards with filters | Good - status filtering, sort |
| Batch Detail | `/propagation/batches/:id` | Full batch view with timeline | Good - stage timeline, actions |
| New Batch Form | Modal | Create propagation batch | Good - searchable species, method groups |
| Stage Transition Modal | Modal | Advance batch stage | Good - validation |
| Explode Batch Modal | Modal | Split batch into individuals | Good - quantity selection |

### Station Management

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Station List | `/propagation/stations` | Grid of station cards | Good - occupancy bars |
| Station Detail | `/propagation/stations/:id` | Individual station view | Good - batch list, environment logs |
| Station Form | Modal | Create/edit station | Good - type selector |
| Environment Log Modal | Modal | Log temperature/humidity | Good - quick entry |

### Mother Plants

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Mother Plant List | `/propagation/mother-plants` | Registry of mother plants | Good - health indicators |
| Mother Plant Detail | `/propagation/mother-plants/:id` | Individual plant history | Good - cutting history |
| Mother Plant Form | Modal | Register new mother plant | Good - acquisition method |
| Health Check Modal | Modal | Record health assessment | Good - 5-point scale |

### Supplies

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Supply List | `/propagation/supplies` | Inventory list with low stock alerts | Good - quantity tracking |
| Supply Detail | `/propagation/supplies/:id` | Individual supply usage history | Good - consumption logs |
| Supply Form | Modal | Add/edit supply item | Good - unit selection |
| Low Stock Alert | Component | Highlight low inventory | Good - attention styling |

### Propagule Tracking

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Propagule Detail | `/propagation/propagules/:id` | Individual propagule tracking | Good - status updates |
| Propagule Update Form | Modal | Update propagule status | Good - quick notes |

### Analytics

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Analytics Dashboard | `/propagation/analytics` | Success rates, outcomes | Good - charts, breakdowns |
| Success Rate Chart | Component | Species success visualization | Good - bar chart |
| Outcomes Chart | Component | Stage outcomes breakdown | Good - distribution |
| Failure Analysis | Component | Common failure reasons | Good - categorized |

### Settings

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Settings Page | `/propagation/settings` | Species configurations | Good - tabbed layout |
| Species Config Form | Modal | Add/edit species defaults | Good - method preferences |
| Data Management | Component | Export/import data | Good - batch operations |

---

## Settings Module

| Screen | Path | Purpose | Current State |
|--------|------|---------|---------------|
| Settings Index | `/settings` | Platform settings page | Good - section cards |
| Preferences | Component | Theme, units, locale | Good - toggle switches |
| AI Settings | Component | Configure AI assistant | Good - provider selection |
| Experiment Config | Component | Experiment parameters | Good - duration, goals |
| Variety Manager | Component | Manage microgreen varieties | Good - CRUD table |
| Data Export | Component | Export/import data | Good - format selection |

---

## Shared Components

### Shell

| Component | Purpose | Current State |
|-----------|---------|---------------|
| AppShell | Main layout wrapper | Good - responsive, PWA aware |
| TopNav | Desktop navigation | Good - module tabs |
| BottomNav | Mobile navigation | Good - 44px touch targets |
| ModuleNav | Sub-module navigation | Good - horizontal scroll |

### UI Components

| Component | Purpose | Current State |
|-----------|---------|---------------|
| Modal | Dialog container | Good - mobile full-screen, desktop centered |
| Tabs | Tab navigation | Good - accessible, keyboard support |
| ConfirmDialog | Confirmation prompts | Good - variant styling |
| KeyboardShortcutsHelp | Keyboard shortcut overlay | Good - modal display |

### Shared

| Component | Purpose | Current State |
|-----------|---------|---------------|
| EmptyState | Empty list placeholder | Good - icon, title, action |
| ComingSoon | Placeholder for future modules | Good - clear messaging |
| ModuleLoader | Loading state | Good - spinner |

---

## Screen Count Summary

| Module | Screens | Modals | Components |
|--------|---------|--------|------------|
| Landing | 1 | 0 | 4 sections |
| Grow | 12 | 5 | 15+ |
| Propagation | 14 | 8 | 20+ |
| Settings | 1 | 0 | 5 |
| Shared | - | 3 | 8 |
| **Total** | **28** | **16** | **50+** |
