# 🌱 Paddock

![CI](https://github.com/comware/paddock/actions/workflows/ci.yml/badge.svg)

**Local-first small farm management platform for microgreens growing experiments**

Paddock is a Progressive Web App (PWA) that helps hobbyist microgreens growers track experiments, manage growing sites, log daily activities, and make data-driven decisions about what to grow next.

## ✨ Features

### 🥬 Grow Module
- **🗂️ Growing Sites Management** - Organize multiple growing locations
- **📋 Tray Tracking** - Monitor individual growing trays from seed to harvest
- **📊 Analytics Dashboard** - Visualize growth patterns and variety performance
- **📅 Planting Calendar** - Plan and schedule future plantings
- **⏱️ Time Tracking** - Log labor hours per variety and activity
- **📝 Daily Logs** - Capture observations, mood, and environmental conditions
- **🤖 AI Growing Assistant** - Get personalized advice from Claude, GPT-4, or Gemini
- **📚 Growing Guide Library** - Access and edit markdown guides
- **🎯 Decision Scorecards** - Evaluate varieties with weighted criteria

### 🌿 Propagation Module
- **📦 Batch Tracking** - Track propagation batches from cutting to graduation
- **🏭 Station Management** - Manage propagation stations with capacity and environment tracking
- **🌳 Mother Plants** - Track mother plants, health checks, and cutting history
- **🔄 Stage Transitions** - Move batches through propagation stages (cutting, rooting, hardening)
- **🌱 Propagule Tracking** - Track individual propagules within batches
- **💰 Cost Tracking** - Log material, labor, and overhead costs per batch
- **📈 Analytics Dashboard** - Success rates, cost analysis, and performance metrics
- **🎓 Graduation Workflow** - Graduate rooted propagules to grow module or external sale
- **📤 Export/Import** - Export and import propagation data
- **⚙️ Species Configuration** - Configure species-specific propagation parameters

### 📅 Planner Module
- **🗓️ Crop Calendar** - Succession planning with calendar view (react-big-calendar)
- **📝 Event Creation** - Create events with lifecycle tracking and status management
- **🔗 Module Integration** - Link events to Grow trays and Propagation batches
- **📋 Event List & Detail Views** - Browse, filter, and inspect planned activities
- **🔄 Lifecycle Tracking** - Track events from planned through active to completed

### 🌐 Platform Features
- **🌙 Dark Mode** - Easy on the eyes during late-night checks
- **📱 Offline-First** - Works without internet, installs as mobile app
- **🔒 Privacy-First** - All data stored locally on your device
- **📱 Mobile Optimized** - Touch-friendly interface with responsive design
- **♿ Skip Nav** - Skip navigation link for keyboard users
- **🔔 Toast Notifications** - Toast notification system for action feedback
- **📢 Live Regions** - aria-live regions for dynamic content updates
- **🎯 Focus Ring Indicators** - Visible focus ring on all interactive elements
- **🎭 Reduced Motion** - prefers-reduced-motion support for animations
- **🏷️ Semantic HTML** - ARIA attributes and semantic markup throughout

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e
```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

**Quick deploy to Vercel:**

```bash
npm install -g vercel
vercel --prod
```

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **Database**: Dexie (IndexedDB wrapper)
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **AI**: Multi-provider support (OpenAI, Anthropic, Gemini)
- **Testing**: Vitest, Playwright, Testing Library
- **PWA**: Vite Plugin PWA with Workbox

## 📊 Monitoring & Analytics

- **Error Tracking**: Sentry for production error monitoring
- **Analytics**: Plausible Analytics (privacy-focused, no cookies)
- **Performance**: Built-in React error boundaries

## 🏗️ Project Structure

```
paddock/
├── src/
│   ├── components/        # Shared UI components
│   ├── modules/
│   │   ├── grow/         # Grow module (trays, sites, calendar)
│   │   ├── planner/      # Planner module (crop calendar, events)
│   │   ├── propagation/  # Propagation module (batches, stations, mother plants)
│   │   └── settings/     # Application settings
│   ├── lib/              # Core libraries (db, ai, monitoring)
│   ├── hooks/            # Custom React hooks
│   └── routes/           # Application routing
├── public/              # Static assets
├── playwright/          # E2E tests
└── docs/               # Project documentation
```


## 💾 Data Backup & Restore

Paddock stores all data locally on your device. To ensure data durability, we recommend regular backups.

### Backup Procedure

1. Go to **Settings** (gear icon in navigation)
2. Find the **Data Management** section
3. Click **Export All Data** (green button)
4. A JSON file named `paddock-full-backup-YYYY-MM-DD.json` will download
5. Store this file safely (cloud storage, external drive, etc.)

### Restore Procedure

1. Go to **Settings**
2. Click **Import Data**
3. Select your backup JSON file
4. Choose **Replace** (clear existing data) or **Merge** (add to existing data)
5. The app will reload with your restored data

### What's Included in Backups

**Full Backup (Export All Data):**
- Grow Module: trays, observations, time entries, variety configs, experiments, decisions
- Propagation Module: batches, stations, mother plants, propagules, graduations, supplies, costs

**Module-specific backups** are also available in each module's settings.

### Best Practices

- Export a backup before major operations
- Keep multiple dated backups
- Test restore on a separate device/browser periodically
- Backups are JSON files that can be inspected if needed

## 🔐 Privacy & Security

- **No backend**: Fully client-side application
- **Local data storage**: All data stays on your device
- **Optional AI**: Configure your own API keys
- **No tracking cookies**: Privacy-first analytics
- **Open source**: Transparent and auditable

## 📱 Installation as App

Paddock can be installed as a standalone app on:

- **iOS**: Tap Share → Add to Home Screen
- **Android**: Tap Menu → Install App
- **Desktop**: Click install icon in address bar (Chrome/Edge)

## 🤝 Contributing

This is a personal project built with Claude Code's agent orchestration system.

## 📄 License

[Add your license here]

## 🙏 Credits

Built with:
- [Claude Code](https://github.com/anthropics/claude-code)
- [Comware](https://github.com/anthropics/comware) - Agent orchestration framework
- React, Vite, and the amazing open source community

---

**Made with 🌱 by hobbyist growers, for hobbyist growers**
