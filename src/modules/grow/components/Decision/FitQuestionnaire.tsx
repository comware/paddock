/**
 * FitQuestionnaire - 6 Personal Fit Sliders
 *
 * Captures subjective assessment of whether microgreens
 * growing is a good fit for the user's lifestyle.
 */

import { useEffect, useState } from 'react';
import { useExperiment } from '../../stores';

interface FitQuestion {
  id: keyof FitScores;
  question: string;
  lowLabel: string;
  highLabel: string;
}

interface FitScores {
  enjoyedRoutine: number;
  satisfiedGrowing: number;
  comfortableFailures: number;
  maintainedConsistency: number;
  familySupportive: number;
  willingToScale: number;
}

const FIT_QUESTIONS: FitQuestion[] = [
  {
    id: 'enjoyedRoutine',
    question: 'I enjoyed the daily routine of checking and caring for my trays',
    lowLabel: 'Felt like a chore',
    highLabel: 'Loved it',
  },
  {
    id: 'satisfiedGrowing',
    question: 'I felt satisfied when I saw healthy growth and successful harvests',
    lowLabel: 'Not really',
    highLabel: 'Very satisfying',
  },
  {
    id: 'comfortableFailures',
    question: 'I was comfortable with failures and used them as learning opportunities',
    lowLabel: 'Frustrated me',
    highLabel: 'Part of the process',
  },
  {
    id: 'maintainedConsistency',
    question: 'I was able to maintain consistent attention even when busy',
    lowLabel: 'Often forgot',
    highLabel: 'Always consistent',
  },
  {
    id: 'familySupportive',
    question: 'My household is supportive of continuing/scaling this activity',
    lowLabel: 'Not supportive',
    highLabel: 'Fully supportive',
  },
  {
    id: 'willingToScale',
    question: "I'm willing to invest more time and money to scale up",
    lowLabel: 'Not interested',
    highLabel: 'Ready to invest',
  },
];

export function FitQuestionnaire() {
  const { decision, loadDecision, saveDecision } = useExperiment();

  const [scores, setScores] = useState<FitScores>({
    enjoyedRoutine: 5,
    satisfiedGrowing: 5,
    comfortableFailures: 5,
    maintainedConsistency: 5,
    familySupportive: 5,
    willingToScale: 5,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadDecision();
  }, [loadDecision]);

  // Sync scores when decision loads
  useEffect(() => {
    if (decision) {
      setScores({
        enjoyedRoutine: decision.enjoyedRoutine ?? 5,
        satisfiedGrowing: decision.satisfiedGrowing ?? 5,
        comfortableFailures: decision.comfortableFailures ?? 5,
        maintainedConsistency: decision.maintainedConsistency ?? 5,
        familySupportive: decision.familySupportive ?? 5,
        willingToScale: decision.willingToScale ?? 5,
      });
    }
  }, [decision]);

  const handleScoreChange = (id: keyof FitScores, value: number) => {
    setScores((prev) => ({ ...prev, [id]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await saveDecision(scores);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save fit scores:', error);
    }
  };

  // Auto-save on blur
  const handleBlur = () => {
    if (isDirty) {
      handleSave();
    }
  };

  const averageScore =
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Personal Fit Assessment
        </h3>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Avg: <span className="font-medium text-slate-900 dark:text-white">
            {averageScore.toFixed(1)}/10
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Rate each statement on a scale of 1-10. Be honest - this helps you make the right decision.
      </p>

      <div className="space-y-6">
        {FIT_QUESTIONS.map((q) => (
          <FitSlider
            key={q.id}
            question={q.question}
            lowLabel={q.lowLabel}
            highLabel={q.highLabel}
            value={scores[q.id]}
            onChange={(v) => handleScoreChange(q.id, v)}
            onBlur={handleBlur}
          />
        ))}
      </div>

      {isDirty && (
        <div className="mt-4 text-right">
          <button
            type="button"
            onClick={handleSave}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUBCOMPONENTS
// ============================================

interface FitSliderProps {
  question: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
}

function FitSlider({ question, lowLabel, highLabel, value, onChange, onBlur }: FitSliderProps) {
  const getColorClass = (val: number) => {
    if (val >= 7) return 'text-green-600 dark:text-green-400';
    if (val >= 4) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {question}
        </span>
        <span className={`text-lg font-bold ${getColorClass(value)}`}>
          {value}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={onBlur}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
          style={{
            background: `linear-gradient(to right,
              ${value <= 3 ? '#ef4444' : value <= 6 ? '#f59e0b' : '#22c55e'} 0%,
              ${value <= 3 ? '#ef4444' : value <= 6 ? '#f59e0b' : '#22c55e'} ${(value - 1) * 11.1}%,
              #e2e8f0 ${(value - 1) * 11.1}%,
              #e2e8f0 100%)`,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
