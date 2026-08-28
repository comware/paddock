/**
 * GettingStarted - the first thing a new greenhouse should say
 *
 * A fresh install landed on a dashboard of zeroes: no trays, no harvests, an empty
 * "Coming up", and nothing indicating what to do first. Every panel was technically
 * correct and collectively useless.
 *
 * Shown only until the grower has sown something, then it disappears for good. Onboarding
 * that outstays its welcome becomes furniture.
 */

import { useNavigate } from 'react-router-dom';

interface GettingStartedProps {
  siteId: string;
  onNewTray: () => void;
}

interface Step {
  title: string;
  body: string;
  action?: { label: string; run: () => void };
}

export function GettingStarted({ siteId, onNewTray }: GettingStartedProps) {
  const navigate = useNavigate();

  const steps: Step[] = [
    {
      title: 'Sow your first tray',
      body: 'Record what you sowed, when, and on what. Everything else builds on this.',
      action: { label: 'New tray', run: onNewTray },
    },
    {
      title: 'Log a line at the end of the day',
      body: 'Paddock fills in the tray counts and the weather. You add what you noticed.',
      action: {
        label: 'Open today’s log',
        run: () => navigate(`/grow/site/${siteId}/daily`),
      },
    },
    {
      title: 'Plan ahead when you are ready',
      body:
        'The calendar works backwards from when you want a harvest — using how long ' +
        'things actually take on your bench, once it has a few to go on.',
      action: { label: 'Planting calendar', run: () => navigate('/grow/calendar') },
    },
  ];

  return (
    <section
      aria-labelledby="getting-started-heading"
      className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-5"
    >
      <h2
        id="getting-started-heading"
        className="text-lg font-bold text-slate-900 dark:text-white"
      >
        Getting started
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Nothing is growing here yet. Three things to know.
      </p>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center"
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {step.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
              {step.action && (
                <button
                  type="button"
                  onClick={step.action.run}
                  className="mt-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline"
                >
                  {step.action.label} &rarr;
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 pt-3 border-t border-primary-200 dark:border-primary-800 text-xs text-slate-500 dark:text-slate-400">
        Everything stays in this browser. Nothing is uploaded anywhere.
      </p>
    </section>
  );
}
