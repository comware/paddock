/**
 * EditTrayForm - Form for editing an existing tray
 *
 * Features:
 * - Tab-based organization (Details | Notes)
 * - Full 4-status selector (blackout, light, harvested, failed)
 * - Edit all tray fields
 * - Delete tray option with confirmation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Tabs, TabPanel, type Tab } from '@/components/ui';
import { useTrays, useVarieties, useMediums, useSites, useTrayComments, type TrayWithComputed, type TrayStatus } from '../../stores';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { TrayComments } from './TrayComments';
import { GrowingGuidePanel } from './GrowingGuidePanel';

const editTraySchema = z.object({
  label: z.string().optional(),
  siteId: z.string().optional(),
  variety: z.string().min(1, 'Please select a variety'),
  seedWeight: z.number().min(1, 'Weight must be at least 1g').max(500, 'Weight cannot exceed 500g'),
  growingMedium: z.string().min(1, 'Please select a growing medium'),
  preSoaked: z.boolean(),
  blackoutDays: z.number().min(1).max(10),
  dateSown: z.string().min(1, 'Please select a date'),
  // Allow NaN (empty input) or valid numbers 0-100, convert NaN to undefined in submit handler
  germinationRate: z.union([
    z.number().min(0, 'Must be 0-100%').max(100, 'Must be 0-100%'),
    z.nan(),
  ]).optional(),
  problemsObserved: z.string(),
  lessonsLearned: z.string(),
});

type EditTrayFormData = z.infer<typeof editTraySchema>;

interface EditTrayFormProps {
  isOpen: boolean;
  onClose: () => void;
  tray: TrayWithComputed;
}

const quickWeights = [50, 80, 100, 120];

const TABS: Tab[] = [
  { id: 'details', label: 'Details' },
  { id: 'notes', label: 'Notes' },
  { id: 'guide', label: 'Growing Guide' },
];

const STATUS_OPTIONS: { value: TrayStatus; label: string; color: string; activeColor: string }[] = [
  { value: 'blackout', label: 'Blackout', color: 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300', activeColor: 'bg-slate-700 text-white' },
  { value: 'light', label: 'Light', color: 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300', activeColor: 'bg-yellow-400 text-yellow-900' },
  { value: 'harvested', label: 'Harvested', color: 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300', activeColor: 'bg-green-500 text-white' },
  { value: 'failed', label: 'Failed', color: 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300', activeColor: 'bg-red-500 text-white' },
];

export function EditTrayForm({ isOpen, onClose, tray }: EditTrayFormProps) {
  const { updateTray, deleteTray, setStatus } = useTrays();
  const { varieties, isLoading: varietiesLoading } = useVarieties();
  const { mediums, loadMediums, isLoading: mediumsLoading } = useMediums();
  const { sites, getDefaultSite } = useSites();
  const { clearComments } = useTrayComments();
  const defaultSite = getDefaultSite();
  const [activeTab, setActiveTab] = useState<string>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TrayStatus>(tray.status);
  const [statusChanged, setStatusChanged] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditTrayFormData>({
    resolver: zodResolver(editTraySchema),
    defaultValues: {
      label: tray.label || '',
      siteId: tray.siteId || defaultSite?.id || '',
      variety: tray.variety,
      seedWeight: tray.seedWeight,
      growingMedium: tray.growingMedium,
      preSoaked: tray.preSoaked,
      blackoutDays: tray.blackoutDays,
      dateSown: format(tray.dateSown, 'yyyy-MM-dd'),
      germinationRate: tray.germinationRate || undefined,
      problemsObserved: tray.problemsObserved || '',
      lessonsLearned: tray.lessonsLearned || '',
    },
  });

  const currentWeight = watch('seedWeight');

  // Load mediums on mount
  useEffect(() => {
    loadMediums();
  }, [loadMediums]);

  // Reset form when tray changes
  useEffect(() => {
    reset({
      label: tray.label || '',
      siteId: tray.siteId || defaultSite?.id || '',
      variety: tray.variety,
      seedWeight: tray.seedWeight,
      growingMedium: tray.growingMedium,
      preSoaked: tray.preSoaked,
      blackoutDays: tray.blackoutDays,
      dateSown: format(tray.dateSown, 'yyyy-MM-dd'),
      germinationRate: tray.germinationRate || undefined,
      problemsObserved: tray.problemsObserved || '',
      lessonsLearned: tray.lessonsLearned || '',
    });
    setCurrentStatus(tray.status);
    setStatusChanged(false);
    setActiveTab('details');
  }, [tray, reset, defaultSite]);

  const onSubmit = async (data: EditTrayFormData) => {
    try {
      // Convert NaN (empty input) to undefined for database storage
      const germinationRate = typeof data.germinationRate === 'number' && !Number.isNaN(data.germinationRate)
        ? data.germinationRate
        : undefined;

      await updateTray(tray.id!, {
        label: data.label || undefined, // Clear label if empty to use default
        siteId: data.siteId || undefined,
        variety: data.variety,
        seedWeight: data.seedWeight,
        growingMedium: data.growingMedium,
        preSoaked: data.preSoaked,
        blackoutDays: data.blackoutDays,
        dateSown: new Date(data.dateSown),
        germinationRate,
        problemsObserved: data.problemsObserved,
        lessonsLearned: data.lessonsLearned,
      });
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to update tray:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTray(tray.id!);
      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete tray:', error);
    }
  };

  const handleStatusChange = async (newStatus: TrayStatus) => {
    if (newStatus === currentStatus) return;

    setIsStatusChanging(true);
    try {
      await setStatus(tray.id!, newStatus);
      setCurrentStatus(newStatus);
      setStatusChanged(true);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to change tray status:', error);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleClose = () => {
    clearComments();
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit ${tray.label || `Tray #${tray.trayNumber}`}`} size="3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Status Selector - Always visible at top */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
            {tray.dateToLight && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Moved to light: {format(tray.dateToLight, 'MMM d')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusChange(option.value)}
                disabled={isStatusChanging}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentStatus === option.value
                    ? option.activeColor
                    : `${option.color} hover:opacity-80`
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Details Tab */}
        <TabPanel isActive={activeTab === 'details'}>
          <div className="space-y-4">
            {/* Custom Label */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Custom Label <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                {...register('label')}
                placeholder={`Tray #${tray.trayNumber}`}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Leave blank to use "Tray #{tray.trayNumber}"
              </p>
            </div>

            {/* Site */}
            {sites.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Site
                </label>
                <select
                  {...register('siteId')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}{site.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Variety */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Variety
              </label>
              <select
                {...register('variety')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={varietiesLoading}
              >
                <option value="">Select variety...</option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
              {errors.variety && (
                <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>
              )}
            </div>

            {/* Date Sown */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Sown
              </label>
              <input
                type="date"
                {...register('dateSown')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.dateSown && (
                <p className="mt-1 text-sm text-red-500">{errors.dateSown.message}</p>
              )}
            </div>

            {/* Seed Weight */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Seed Weight (g)
              </label>
              <div className="flex gap-2 mb-2">
                {quickWeights.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setValue('seedWeight', w, { shouldDirty: true })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentWeight === w
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {w}g
                  </button>
                ))}
              </div>
              <input
                type="number"
                {...register('seedWeight', { valueAsNumber: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.seedWeight && (
                <p className="mt-1 text-sm text-red-500">{errors.seedWeight.message}</p>
              )}
            </div>

            {/* Growing Medium */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Growing Medium
              </label>
              <select
                {...register('growingMedium')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={mediumsLoading}
              >
                {mediums.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-soaked & Blackout Days Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="preSoaked"
                  {...register('preSoaked')}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
                />
                <label
                  htmlFor="preSoaked"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Pre-soaked
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Blackout Days
                </label>
                <input
                  type="number"
                  {...register('blackoutDays', { valueAsNumber: true })}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Germination Rate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Germination Rate (%)
              </label>
              <input
                type="number"
                {...register('germinationRate', { valueAsNumber: true })}
                min={0}
                max={100}
                placeholder="e.g., 85"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel isActive={activeTab === 'notes'}>
          <div className="space-y-4">
            {/* Problems Observed */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Problems Observed
              </label>
              <textarea
                {...register('problemsObserved')}
                rows={3}
                placeholder="Any issues noticed..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Lessons Learned */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lessons Learned
              </label>
              <textarea
                {...register('lessonsLearned')}
                rows={3}
                placeholder="What would you do differently..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Comments Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Comments
              </label>
              <TrayComments trayId={tray.id!} />
            </div>
          </div>
        </TabPanel>

        {/* Growing Guide Tab */}
        <TabPanel isActive={activeTab === 'guide'}>
          <GrowingGuidePanel varietyName={watch('variety')} />
        </TabPanel>

        {/* Danger Zone - Always visible at bottom */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Danger Zone</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Permanent actions</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete Tray
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Are you sure you want to delete Tray #{tray.trayNumber}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!isDirty && !statusChanged)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
