/**
 * Scorecard - Week 6 Decision Analysis
 *
 * Auto-populates metrics from all tracked data.
 * Shows pass/fail for each criterion.
 * Includes decision selector and reflection fields.
 */

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTrays, useTimeEntries, useExperiment } from '../../stores';
import { FitQuestionnaire } from './FitQuestionnaire';

type DecisionChoice = 'hell_yes' | 'extend' | 'pivot' | 'stop';

const DECISION_OPTIONS: { value: DecisionChoice; label: string; emoji: string; description: string }[] = [
  {
    value: 'hell_yes',
    label: 'Hell Yes!',
    emoji: '🚀',
    description: 'Ready to scale up and commit fully',
  },
  {
    value: 'extend',
    label: 'Extend Trial',
    emoji: '🔄',
    description: 'Need more data - continue 2-4 more weeks',
  },
  {
    value: 'pivot',
    label: 'Pivot',
    emoji: '↪️',
    description: 'Try different approach (varieties, scale, timing)',
  },
  {
    value: 'stop',
    label: 'Stop',
    emoji: '🛑',
    description: 'Not the right fit - valuable learning',
  },
];

export function Scorecard() {
  const { trays, loadTrays } = useTrays();
  const { loadEntries, getThisWeeksTotal } = useTimeEntries();
  const {
    experiment,
    decision,
    loadExperiment,
    loadDecision,
    saveDecision,
    getExperimentMetrics,
    getCriteriaStatus,
    getFitScore,
    isLoading,
  } = useExperiment();

  const [selectedDecision, setSelectedDecision] = useState<DecisionChoice | undefined>(decision?.decision);
  const [reflections, setReflections] = useState({
    surprises: decision?.surprises ?? '',
    harderThanExpected: decision?.harderThanExpected ?? '',
    easierThanExpected: decision?.easierThanExpected ?? '',
    wouldDoDifferently: decision?.wouldDoDifferently ?? '',
    neededForConfidence: decision?.neededForConfidence ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTrays();
    loadEntries();
    loadExperiment();
    loadDecision();
  }, [loadTrays, loadEntries, loadExperiment, loadDecision]);

  // Sync decision state when loaded
  useEffect(() => {
    if (decision) {
      setSelectedDecision(decision.decision);
      setReflections({
        surprises: decision.surprises ?? '',
        harderThanExpected: decision.harderThanExpected ?? '',
        easierThanExpected: decision.easierThanExpected ?? '',
        wouldDoDifferently: decision.wouldDoDifferently ?? '',
        neededForConfidence: decision.neededForConfidence ?? '',
      });
    }
  }, [decision]);

  const metrics = useMemo(() => getExperimentMetrics(trays), [trays, getExperimentMetrics]);
  const weeklyHours = getThisWeeksTotal() / 60;
  const criteria = useMemo(
    () => getCriteriaStatus(metrics, weeklyHours),
    [metrics, weeklyHours, getCriteriaStatus]
  );

  const passedCount = criteria.filter((c) => c.passed).length;
  const fitScore = getFitScore();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDecision({
        decision: selectedDecision,
        ...reflections,
      });
    } catch (error) {
      console.error('Failed to save decision:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const markdown = generateMarkdownExport(
      experiment,
      metrics,
      criteria,
      fitScore,
      selectedDecision,
      reflections
    );

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `microgreens-decision-${format(new Date(), 'yyyy-MM-dd')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Week 6 Decision Scorecard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {metrics.isComplete
                ? 'Experiment complete - time to decide!'
                : `${metrics.weeksRemaining} weeks remaining`}
            </p>
          </div>
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                passedCount >= 4
                  ? 'text-green-600 dark:text-green-400'
                  : passedCount >= 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {passedCount}/{criteria.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Criteria Passed</div>
          </div>
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Success Criteria
        </h3>
        <div className="space-y-3">
          {criteria.map((criterion) => (
            <div
              key={criterion.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                criterion.passed
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{criterion.passed ? '✅' : '❌'}</span>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {criterion.label}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Target: {criterion.target}
                  </div>
                </div>
              </div>
              <div
                className={`text-lg font-bold ${
                  criterion.passed
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {criterion.actual}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Fit Questionnaire */}
      <FitQuestionnaire />

      {/* Fit Score Summary */}
      {fitScore !== null && (
        <div className="card p-6 text-center">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            Personal Fit Score
          </div>
          <div
            className={`text-4xl font-bold ${
              fitScore >= 7
                ? 'text-green-600 dark:text-green-400'
                : fitScore >= 5
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {fitScore}/10
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {fitScore >= 7 ? 'Strong fit!' : fitScore >= 5 ? 'Moderate fit' : 'May not be the best fit'}
          </div>
        </div>
      )}

      {/* Decision Selector */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Your Decision
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DECISION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedDecision(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedDecision === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{option.emoji}</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {option.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Reflections */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Reflections
        </h3>
        <div className="space-y-4">
          <ReflectionField
            label="What surprised you?"
            value={reflections.surprises}
            onChange={(v) => setReflections((r) => ({ ...r, surprises: v }))}
          />
          <ReflectionField
            label="What was harder than expected?"
            value={reflections.harderThanExpected}
            onChange={(v) => setReflections((r) => ({ ...r, harderThanExpected: v }))}
          />
          <ReflectionField
            label="What was easier than expected?"
            value={reflections.easierThanExpected}
            onChange={(v) => setReflections((r) => ({ ...r, easierThanExpected: v }))}
          />
          <ReflectionField
            label="What would you do differently?"
            value={reflections.wouldDoDifferently}
            onChange={(v) => setReflections((r) => ({ ...r, wouldDoDifferently: v }))}
          />
          <ReflectionField
            label="What do you need to feel confident scaling up?"
            value={reflections.neededForConfidence}
            onChange={(v) => setReflections((r) => ({ ...r, neededForConfidence: v }))}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleExport}
          className="btn bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          Export as Markdown
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
        >
          {isSaving ? 'Saving...' : 'Save Decision'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// SUBCOMPONENTS
// ============================================

interface ReflectionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ReflectionField({ label, value, onChange }: ReflectionFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full h-20 resize-none"
        placeholder="Your thoughts..."
      />
    </div>
  );
}

// ============================================
// EXPORT HELPER
// ============================================

function generateMarkdownExport(
  _experiment: any,
  metrics: any,
  criteria: any[],
  fitScore: number | null,
  decision: DecisionChoice | undefined,
  reflections: Record<string, string>
): string {
  const decisionLabel = DECISION_OPTIONS.find((d) => d.value === decision)?.label ?? 'Not decided';

  return `# Microgreens Experiment - Week 6 Decision

**Date**: ${format(new Date(), 'MMMM d, yyyy')}

## Experiment Summary

- **Days Elapsed**: ${metrics.daysElapsed}
- **Trays Completed**: ${metrics.harvestedTrays} of ${metrics.totalTrays}
- **Success Rate**: ${metrics.overallSuccessRate}%
- **Average Yield Ratio**: ${metrics.avgYieldRatio}x
- **Total Harvest**: ${metrics.totalHarvestWeight}g

## Success Criteria

${criteria.map((c) => `- [${c.passed ? 'x' : ' '}] ${c.label}: ${c.actual} (target: ${c.target})`).join('\n')}

**Criteria Passed**: ${criteria.filter((c) => c.passed).length}/${criteria.length}

## Personal Fit Score

**Score**: ${fitScore ?? 'Not assessed'}/10

## Decision

**${decisionLabel}** ${DECISION_OPTIONS.find((d) => d.value === decision)?.emoji ?? ''}

## Reflections

### What surprised you?
${reflections.surprises || '_Not answered_'}

### What was harder than expected?
${reflections.harderThanExpected || '_Not answered_'}

### What was easier than expected?
${reflections.easierThanExpected || '_Not answered_'}

### What would you do differently?
${reflections.wouldDoDifferently || '_Not answered_'}

### What do you need to feel confident scaling up?
${reflections.neededForConfidence || '_Not answered_'}

---
*Generated by Paddock Grow Module*
`;
}
