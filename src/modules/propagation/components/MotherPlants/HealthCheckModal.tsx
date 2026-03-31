/**
 * HealthCheckModal - Record health assessment for a mother plant
 *
 * Allows quick health logging with 1-5 score, notes, and date.
 * Updates the last health check on the mother plant.
 */

import { useState } from 'react';
import { Modal } from '@/components/ui';
import type { PropMotherPlantWithComputed } from '../../stores/useMotherPlants';

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: PropMotherPlantWithComputed | null;
  onSubmit: (id: string, score: number, notes?: string) => Promise<void>;
}

/**
 * Health score descriptions.
 */
const HEALTH_SCORES: Array<{ value: number; label: string; description: string; color: string }> = [
  { value: 1, label: 'Critical', description: 'Major issues, may not survive', color: 'bg-red-500' },
  { value: 2, label: 'Poor', description: 'Significant problems, needs attention', color: 'bg-orange-500' },
  { value: 3, label: 'Fair', description: 'Some issues, but generally okay', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', description: 'Healthy with minor issues', color: 'bg-lime-500' },
  { value: 5, label: 'Excellent', description: 'Thriving, no issues', color: 'bg-green-500' },
];

export function HealthCheckModal({
  isOpen,
  onClose,
  plant,
  onSubmit,
}: HealthCheckModalProps) {
  const [score, setScore] = useState<number>(plant?.healthScore || 3);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(plant.id, score, notes || undefined);
      setNotes('');
      onClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to record health check:', error);
      setSubmitError((error as Error).message || 'Failed to record health check');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  // Reset score when plant changes
  if (plant && plant.healthScore !== undefined && score !== plant.healthScore) {
    setScore(plant.healthScore);
  }

  if (!plant) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Health Check" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Plant Info */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
          <div className="font-medium text-slate-900 dark:text-white">
            {plant.label}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {plant.species}
            {plant.variety && ` - ${plant.variety}`}
          </div>
        </div>

        {/* Health Score Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Health Score
          </label>
          <div className="space-y-2">
            {HEALTH_SCORES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScore(option.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                  score === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                {/* Color Indicator */}
                <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center text-white font-bold`}>
                  {option.value}
                </div>
                {/* Label and Description */}
                <div className="text-left flex-1">
                  <div className={`font-medium ${score === option.value ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {option.description}
                  </div>
                </div>
                {/* Check Mark */}
                {score === option.value && (
                  <div className="text-primary-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Any observations about this health check..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          {submitError && (
            <div className="col-span-2 w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Health Check'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
