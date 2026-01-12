# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Propagation Module - Complete Implementation
A full-featured plant propagation tracking system, implemented across 5 sprints with 30 tasks.

**Core Features (Sprint 1-2)**
- Batch tracking with unique batch numbering and stage management
- Propagation stations with capacity tracking and environment logging
- Mother plant registry with health checks and cutting history
- Stage transition workflow (cutting → rooting → hardening → graduated)
- TypeScript types and Dexie database schema

**Cost & Analytics (Sprint 3-4)**
- Supplies inventory management for propagation materials
- Per-batch cost tracking (materials, labor, overhead)
- Cost-per-propagule calculations
- Analytics dashboard with success rates and performance metrics
- Batch analytics store with computed metrics

**Production Features (Sprint 5)**
- Graduation workflow to move rooted propagules to grow module
- Individual propagule tracking within batches
- Export/import functionality for data backup and transfer
- Species configuration for propagation parameters
- Mobile-optimized UI with touch-friendly controls
- Dark mode support throughout propagation module

**Technical Implementation**
- 83 TypeScript/React files
- 11 component categories: Analytics, Batches, Costs, Dashboard, Graduation, MotherPlants, Propagules, Settings, Stations, Supplies
- 10 Zustand stores for state management
- Utility modules for calculations, exports, and stage helpers
- Comprehensive test coverage

### Changed
- README updated to reflect dual-module architecture (Grow + Propagation)
- Project structure documentation updated to show propagation module

---

## [0.1.0] - 2025-01-06

### Added
- Initial Grow module with tray tracking and site management
- Growing sites management
- Tray tracking from seed to harvest
- Analytics dashboard
- Planting calendar
- Time tracking
- Daily logs
- AI growing assistant (multi-provider)
- Growing guide library
- Decision scorecards
- Dark mode
- PWA with offline support
- Privacy-first local data storage
