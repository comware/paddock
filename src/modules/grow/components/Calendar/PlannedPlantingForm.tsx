/**
 * PlannedPlantingForm - Form for creating/editing planned plantings
 *
 * Features:
 * - Select variety (auto-calculates harvest date)
 * - Choose sow date or target harvest date (auto-calculates the other)
 * - Set quantity and optional notes
 */

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { useVarieties, usePlannedPlantings } from '../../stores';

interface PlannedPlantingFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  siteId?: string;
  editingId?: string; // For edit mode
}

type DateMode = 'sow' | 'harvest';

export function PlannedPlantingForm({
  isOpen,
  onClose,
  initialDate,
  siteId,
  editingId,
}: PlannedPlantingFormProps) {
  const { varieties, loadVarieties, getVariety } = useVarieties();
  const { addPlanting, updatePlanting, getPlantingById } = usePlannedPlantings();

  // Form state
  const [variety, setVariety] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('sow');
  const [sowDate, setSowDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load varieties on mount
  useEffect(() => {
    loadVarieties();
  }, [loadVarieties]);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingId) {
        // Edit mode - load existing planting
        const planting = getPlantingById(editingId);
        if (planting) {
          setVariety(planting.variety);
          setSowDate(format(planting.plannedSowDate, 'yyyy-MM-dd'));
          setHarvestDate(format(planting.targetHarvestDate, 'yyyy-MM-dd'));
          setQuantity(planting.quantity);
          setNotes(planting.notes || '');
        }
      } else {
        // New planting - use initial date
        const date = initialDate || new Date();
        setSowDate(format(date, 'yyyy-MM-dd'));
        setVariety('');
        setQuantity(1);
        setNotes('');
        setHarvestDate('');
      }
    }
  }, [isOpen, initialDate, editingId, getPlantingById]);

  // Auto-calculate harvest date when variety or sow date changes
  useEffect(() => {
    if (variety && sowDate && dateMode === 'sow') {
      const varietyConfig = getVariety(variety);
      if (varietyConfig?.typicalDaysToHarvest) {
        const sowDateObj = new Date(sowDate);
        const calculatedHarvest = addDays(sowDateObj, varietyConfig.typicalDaysToHarvest);
        setHarvestDate(format(calculatedHarvest, 'yyyy-MM-dd'));
      }
    }
  }, [variety, sowDate, dateMode, getVariety]);

  // Auto-calculate sow date when variety or harvest date changes
  useEffect(() => {
    if (variety && harvestDate && dateMode === 'harvest') {
      const varietyConfig = getVariety(variety);
      if (varietyConfig?.typicalDaysToHarvest) {
        const harvestDateObj = new Date(harvestDate);
        const calculatedSow = subDays(harvestDateObj, varietyConfig.typicalDaysToHarvest);
        setSowDate(format(calculatedSow, 'yyyy-MM-dd'));
      }
    }
  }, [variety, harvestDate, dateMode, getVariety]);

  // Check if sow date is in the past
  const sowDateObj = sowDate ? new Date(sowDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isSowDatePast = sowDateObj && sowDateObj < today;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!variety || !sowDate || !harvestDate || quantity < 1) {
      return;
    }

    setIsSubmitting(true);

    try {
      const plantingData = {
        variety,
        plannedSowDate: new Date(sowDate),
        targetHarvestDate: new Date(harvestDate),
        quantity,
        notes: notes.trim() || undefined,
        status: 'planned' as const,
        siteId,
      };

      if (editingId) {
        await updatePlanting(editingId, plantingData);
      } else {
        await addPlanting(plantingData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save planting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingId ? 'Edit Planned Planting' : 'Plan a Planting'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Variety Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Variety
            </label>
            <select
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Select a variety...</option>
              {varieties.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} ({v.typicalDaysToHarvest} days)
                </option>
              ))}
            </select>
          </div>

          {/* Date Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Plan by
            </label>
            <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setDateMode('sow')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  dateMode === 'sow'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Sow Date
              </button>
              <button
                type="button"
                onClick={() => setDateMode('harvest')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  dateMode === 'harvest'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Harvest Date
              </button>
            </div>
          </div>

          {/* Sow Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {dateMode === 'sow' ? 'Sow Date' : 'Sow Date (calculated)'}
            </label>
            <input
              type="date"
              value={sowDate}
              onChange={(e) => {
                setSowDate(e.target.value);
                if (dateMode === 'harvest') setDateMode('sow');
              }}
              className={`w-full px-3 py-2 rounded-lg border ${
                dateMode === 'harvest'
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
              } text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
              required
            />
            {isSowDatePast && (
              <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                ⚠️ This sow date is in the past
              </p>
            )}
          </div>

          {/* Harvest Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {dateMode === 'harvest' ? 'Target Harvest Date' : 'Expected Harvest (calculated)'}
            </label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => {
                setHarvestDate(e.target.value);
                if (dateMode === 'sow') setDateMode('harvest');
              }}
              className={`w-full px-3 py-2 rounded-lg border ${
                dateMode === 'sow'
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
              } text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
              required
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Number of Trays
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Any special instructions or reminders..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !variety || !sowDate || !harvestDate}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add to Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
