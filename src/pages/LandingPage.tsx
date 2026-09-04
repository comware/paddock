/**
 * LandingPage - Compelling entry point for Paddock
 *
 * A beginner-friendly landing page that introduces the microherb farming
 * education portal. Designed to be welcoming, informative, and encouraging
 * for users with no prior microherb experience.
 *
 * Sections:
 * - Hero: Value proposition with primary CTA
 * - Features: 4 key benefits with icons
 * - Learning Paths: Visual navigation cards for educational content
 * - Getting Started: 3-step beginner guide
 * - Encouragement: Motivational message
 * - Footer: Navigation and mission statement
 */

import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

// Feature cards data - focused on educational value
const features = [
  {
    icon: '📚',
    title: 'Step-by-Step Guides',
    description:
      'Clear, beginner-friendly guides walk you through every stage from seed selection to harvest.',
  },
  {
    icon: '📊',
    title: 'Track Your Progress',
    description:
      'Log daily observations, monitor growth stages, and watch your skills improve with each tray.',
  },
  {
    icon: '🎯',
    title: 'Smart Decisions',
    description:
      'Get guided recommendations for harvest timing, troubleshooting, and optimizing your yields.',
  },
  {
    icon: '🌡️',
    title: 'Environment Awareness',
    description:
      'Learn how temperature, humidity, and light affect your microherbs for consistent success.',
  },
];

// Learning paths - visual navigation cards
const learningPaths = [
  {
    icon: '🌱',
    title: 'Growing Guides',
    description: 'Comprehensive guides for popular microherb varieties with care instructions.',
    link: '/microgreens/guides',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: '📅',
    title: 'Planting Calendar',
    description: 'Plan your planting schedule and track optimal growing windows.',
    link: '/microgreens/calendar',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: '📈',
    title: 'Analytics Dashboard',
    description: 'Track success rates, yields, and identify patterns across all your trays.',
    link: '/microgreens/analytics',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: '🏠',
    title: 'Manage growing spaces',
    description: 'Set up and organize your growing locations from windowsills to grow rooms.',
    link: '/microgreens',
    color: 'from-amber-500 to-orange-600',
  },
];

// Getting started steps
const steps = [
  {
    number: '1',
    title: 'Set up your first growing space',
    description:
      "Wherever you grow — a sunny windowsill, a grow tent, a greenhouse, a spare room.",
  },
  {
    number: '2',
    title: 'Start Your First Tray',
    description:
      'Choose a beginner-friendly variety like pea shoots or sunflower, and plant your first tray.',
  },
  {
    number: '3',
    title: 'Learn As You Grow',
    description:
      'Follow daily care guides, log your observations, and watch your microherbs flourish.',
  },
];

export function LandingPage() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Simple toggle between light and dark (overrides system preference)
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🌱</span>
            <span className="font-bold text-2xl text-slate-900 dark:text-white">
              Paddock
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-slate-900 -z-10" />
        <div className="absolute top-20 right-10 text-8xl opacity-20 rotate-12 hidden md:block">
          🌿
        </div>
        <div className="absolute bottom-10 left-10 text-6xl opacity-20 -rotate-12 hidden md:block">
          🪴
        </div>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            {/* Tagline badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/40 rounded-full text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
              <span>🎓</span>
              <span>Your Complete Learning Portal</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
              Learn to Grow
              <span className="text-primary-600 dark:text-primary-400"> Microherbs</span>
              <br />
              <span className="text-3xl md:text-4xl lg:text-5xl text-slate-600 dark:text-slate-400">
                From Seed to Harvest
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-100">One place to learn everything</strong> about
              microherb farming. Step-by-step guides, progress tracking, and smart recommendations —
              designed for complete beginners with zero experience.
            </p>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="text-primary-500">✓</span> No experience needed
              </span>
              <span className="flex items-center gap-1">
                <span className="text-primary-500">✓</span> First harvest in 7-14 days
              </span>
              <span className="flex items-center gap-1">
                <span className="text-primary-500">✓</span> Works offline
              </span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/microgreens"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/25 transition-all hover:scale-105 hover:shadow-xl"
              >
                Start Learning
                <span className="ml-2">→</span>
              </Link>
              <Link
                to="/microgreens/guides"
                className="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 transition-all"
              >
                Explore Guides
                <span className="ml-2">📖</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Everything You Need to Succeed
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Paddock combines education, tracking, and smart guidance to help you become
              a confident microherb grower.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-800 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Paths Section - Quick Navigation */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Choose Your Learning Path
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Jump into any area that interests you. Each section is designed for beginners
              and guides you step-by-step.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {learningPaths.map((path) => (
              <Link
                key={path.title}
                to={path.link}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-transparent transition-all hover:shadow-xl hover:scale-[1.02]"
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${path.color} opacity-0 group-hover:opacity-10 transition-opacity`}
                />

                <div className="p-6 relative">
                  <div className="text-4xl mb-4">{path.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {path.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                    {path.description}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
                    Explore
                    <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Getting Started is Easy
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              You don't need a green thumb or fancy equipment. Here's how to begin
              your microherb journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-300 to-transparent dark:from-primary-700 -z-10" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/microgreens"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/25 transition-all hover:scale-105"
            >
              Begin Your Growing Journey
              <span className="ml-2">🌱</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Encouragement Section */}
      <section className="py-16 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-6">✨</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Everyone Starts Somewhere
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed max-w-2xl mx-auto">
            Microherbs are forgiving plants perfect for beginners. With Paddock guiding you,
            you'll be harvesting your first crop in just 7-14 days. Your journey to fresh,
            home-grown nutrition starts today.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand & Mission */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🌱</span>
                <span className="font-bold text-xl text-slate-800 dark:text-white">
                  Paddock
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-md">
                Our mission is to make microherb farming accessible to everyone. Whether you're
                growing on a windowsill or in a dedicated space, Paddock provides the knowledge
                and tools to help you succeed — one tray at a time.
              </p>
            </div>

            {/* Quick Links */}
            <nav aria-label="Footer navigation">
              <h4 className="font-semibold text-slate-800 dark:text-white mb-3">
                Quick Links
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/microgreens"
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/microgreens/guides"
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    Growing Guides
                  </Link>
                </li>
                <li>
                  <Link
                    to="/microgreens/calendar"
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    Planting Calendar
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-center text-sm text-slate-500 dark:text-slate-500">
              Learn. Grow. Thrive. — A personal education portal for microherb farming.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
