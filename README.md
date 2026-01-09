# 🌱 Paddock

**Local-first small farm management platform for microgreens growing experiments**

Paddock is a Progressive Web App (PWA) that helps hobbyist microgreens growers track experiments, manage growing sites, log daily activities, and make data-driven decisions about what to grow next.

## ✨ Features

- **🗂️ Growing Sites Management** - Organize multiple growing locations
- **📋 Tray Tracking** - Monitor individual growing trays from seed to harvest
- **📊 Analytics Dashboard** - Visualize growth patterns and variety performance
- **📅 Planting Calendar** - Plan and schedule future plantings
- **⏱️ Time Tracking** - Log labor hours per variety and activity
- **📝 Daily Logs** - Capture observations, mood, and environmental conditions
- **🤖 AI Growing Assistant** - Get personalized advice from Claude, GPT-4, or Gemini
- **📚 Growing Guide Library** - Access and edit markdown guides
- **🎯 Decision Scorecards** - Evaluate varieties with weighted criteria
- **🌙 Dark Mode** - Easy on the eyes during late-night checks
- **📱 Offline-First** - Works without internet, installs as mobile app
- **🔒 Privacy-First** - All data stored locally on your device

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
│   ├── modules/          # Feature modules (grow, settings)
│   ├── lib/              # Core libraries (db, ai, monitoring)
│   ├── hooks/            # Custom React hooks
│   └── routes/           # Application routing
├── public/              # Static assets
├── playwright/          # E2E tests
└── docs/               # Project documentation
```

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
