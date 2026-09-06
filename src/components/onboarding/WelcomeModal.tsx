/**
 * WelcomeModal - First-time user onboarding flow
 *
 * Shows a 3-step modal to introduce new users to Paddock.
 * Uses localStorage to track completion and prevent showing again.
 *
 * This is a native <dialog> opened with showModal(), rather than the shared Modal, because
 * its chrome is deliberately different - progress dots and a Skip link where the shared
 * Modal puts a title and a close button - and routing it through the generic shell would
 * flatten the design.
 *
 * It was a plain div before, which is the part that mattered: no dialog role, nothing
 * listening for Escape, and no focus management, on the very first screen a new grower
 * meets. Focus could tab straight out into the page behind it, which is still there and
 * still interactive. showModal() supplies the role, the Escape handling, the focus trap and
 * an inert background from the platform; none of it is reimplemented here.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'paddock_onboarding_complete';

interface Step {
  title: string;
  description: string;
  icon: string;
  cta?: {
    text: string;
    to: string;
  };
}

const steps: Step[] = [
  {
    title: 'Welcome to Paddock',
    description: 'Your local-first farm management platform. Track your growing operation, manage trays, and get insights—all stored right on your device.',
    icon: '🌱',
  },
  {
    title: 'Discover Growing Guides',
    description: 'Access 50+ variety-specific growing guides with detailed cultivation instructions, ideal conditions, and harvest timing.',
    icon: '📚',
    cta: {
      text: 'Browse Guides',
      to: '/microgreens/guides',
    },
  },
  {
    title: 'Start Growing',
    description: 'Ready to begin? Add your first tray and start tracking your microgreens from seed to harvest.',
    icon: '🚀',
    cta: {
      text: 'Add First Tray',
      to: '/microgreens/trays',
    },
  },
];

export function WelcomeModal() {
  // Initialize state from localStorage directly - no effect needed
  const [isOpen, setIsOpen] = useState(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    return !hasCompleted;
  });
  const [currentStep, setCurrentStep] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'skipped');
    handleClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      localStorage.setItem(STORAGE_KEY, 'true');
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Escape fires 'cancel'. Treat it as Skip rather than a silent dismissal, so the
    // "don't show again" flag is written and the grower is not met with this every load.
    const handleCancel = (event: Event) => {
      event.preventDefault();
      handleSkip();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  });

  if (!isOpen) {
    return null;
  }

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-heading"
      className="max-w-md w-full bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Progress dots */}
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary-500'
                      : index < currentStep
                        ? 'w-2 bg-primary-300 dark:bg-primary-700'
                        : 'w-2 bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{step.icon}</div>
            <h2 id="welcome-heading" className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* CTA Button (if present in step) */}
          {step.cta && (
            <Link
              to={step.cta.to}
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, 'true');
                handleClose();
              }}
              className="block w-full mb-3 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors text-center"
            >
              {step.cta.text}
            </Link>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className={`px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors ${
                isFirstStep ? 'flex-1' : 'flex-1'
              }`}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
