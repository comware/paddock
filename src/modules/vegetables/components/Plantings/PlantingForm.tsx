/**
 * PlantingForm - Modal for creating and editing vegetable plantings.
 *
 * A planting is the record you open and work in - the vegetable equivalent of a tray, but
 * harvested over weeks rather than once. siteId is not a field here - it comes from the
 * active site, the same convention BedForm uses.
 *
 * Only one sowing date field is shown at a time, matched to `method`: a transplanted
 * planting has a transplant date, a direct-sown one has a sow date. Showing both invites
 * contradictory data - a plant cannot be both direct-sown today and transplanted last week.
 *
 * Succession support: pass `sowNextFrom` (the planting being succeeded) and this form
 * pre-fills crop, variety, bed, and spacing from it, and records `previousPlantingId` so the
 * interval between successions can be measured against what the previous planting yielded.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { usePlantings } from '../../stores/usePlantings';
import { useBeds } from '../../stores/useBeds';
import { useSites } from '@/platform';
import type { VegPlanting } from '@/lib/db';
import { CropGuidePanel } from './CropGuidePanel';

// ============================================
// VALIDATION SCHEMA
// ============================================

const plantingSchema = z.object({
  crop: z.string().min(1, 'Crop is required').max(100, 'Crop name too long'),
  variety: z.string().max(100, 'Variety too long').optional(),
  bedId: z.string().min(1, 'Bed is required'),
  bedPortion: z.string().max(100, 'Too long').optional(),
  method: z.enum(['direct_sown', 'transplanted']),
  dateSown: z.string().optional(),
  dateTransplanted: z.string().optional(),
  plantCount: z.number().min(0, 'Must be 0 or more').optional(),
  spacingCm: z.number().min(0, 'Must be 0 or more').optional(),
  expectedFirstHarvest: z.string().optional(),
  status: z.enum(['planned', 'growing', 'harvesting', 'finished', 'failed']),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

type PlantingFormData = z.infer<typeof plantingSchema>;

// ============================================
// PROPS
// ============================================

interface PlantingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plantingId: string) => void;
  editPlanting?: VegPlanting; // If provided, form is in edit mode
  sowNextFrom?: VegPlanting; // If provided, form pre-fills as a succession of this planting
}

// ============================================
// HELPERS
// ============================================

function toDateInputValue(date?: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInputValue(value?: string): Date | undefined {
  if (!value) return undefined;
  return new Date(value);
}

const emptyDefaults: PlantingFormData = {
  crop: '',
  variety: '',
  bedId: '',
  bedPortion: '',
  method: 'direct_sown',
  dateSown: '',
  dateTransplanted: '',
  plantCount: undefined,
  spacingCm: undefined,
  expectedFirstHarvest: '',
  status: 'planned',
  notes: '',
};

// ============================================
// COMPONENT
// ============================================

export function PlantingForm({ isOpen, onClose, onSuccess, editPlanting, sowNextFrom }: PlantingFormProps) {
  const { addPlanting, updatePlanting } = usePlantings();
  const { beds, loadBeds, activeBeds } = useBeds();
  const { getActiveSite, getDefaultSite, loadSites } = useSites();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!editPlanting;
  const isSuccession = !isEditMode && !!sowNextFrom;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlantingFormData>({
    resolver: zodResolver(plantingSchema),
    defaultValues: emptyDefaults,
  });

  const method = watch('method');
  const dateSown = watch('dateSown');
  const dateTransplanted = watch('dateTransplanted');

  // Load sites and beds on mount so the active site's active beds are available.
  useEffect(() => {
    if (isOpen) {
      loadSites();
      loadBeds();
    }
  }, [isOpen, loadSites, loadBeds]);

  const activeSite = getActiveSite() || getDefaultSite();
  const siteId = activeSite?.id;
  const bedsForSite = siteId ? activeBeds().filter((b) => b.siteId === siteId) : [];

  // Reset form when opening: edit mode restores the existing record, succession mode
  // pre-fills from the planting being succeeded, otherwise it's a blank form.
  useEffect(() => {
    if (!isOpen) return;

    if (editPlanting) {
      reset({
        crop: editPlanting.crop,
        variety: editPlanting.variety || '',
        bedId: editPlanting.bedId,
        bedPortion: editPlanting.bedPortion || '',
        method: editPlanting.method,
        dateSown: toDateInputValue(editPlanting.dateSown),
        dateTransplanted: toDateInputValue(editPlanting.dateTransplanted),
        plantCount: editPlanting.plantCount,
        spacingCm: editPlanting.spacingCm,
        expectedFirstHarvest: toDateInputValue(editPlanting.expectedFirstHarvest),
        status: editPlanting.status,
        notes: editPlanting.notes || '',
      });
    } else if (sowNextFrom) {
      reset({
        ...emptyDefaults,
        crop: sowNextFrom.crop,
        variety: sowNextFrom.variety || '',
        bedId: sowNextFrom.bedId,
        spacingCm: sowNextFrom.spacingCm,
      });
    } else {
      reset(emptyDefaults);
    }
  }, [isOpen, editPlanting, sowNextFrom, reset]);

  // New plantings default to 'planned' unless a date in the past is given, in which case
  // 'growing' is the sensible default - but the user can still see and change it via the
  // status field.
  useEffect(() => {
    if (isEditMode) return;
    const relevantDate = method === 'transplanted' ? dateTransplanted : dateSown;
    if (relevantDate) {
      const parsed = fromDateInputValue(relevantDate);
      if (parsed && parsed.getTime() <= Date.now()) {
        setValue('status', 'growing');
        return;
      }
    }
    setValue('status', 'planned');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, dateSown, dateTransplanted, isEditMode]);

  const onSubmit = async (data: PlantingFormData) => {
    setSubmitError(null);

    try {
      const shared = {
        crop: data.crop.trim(),
        variety: data.variety?.trim() || undefined,
        bedId: data.bedId,
        bedPortion: data.bedPortion?.trim() || undefined,
        method: data.method,
        dateSown: data.method === 'direct_sown' ? fromDateInputValue(data.dateSown) : undefined,
        dateTransplanted: data.method === 'transplanted' ? fromDateInputValue(data.dateTransplanted) : undefined,
        plantCount: data.plantCount,
        spacingCm: data.spacingCm,
        expectedFirstHarvest: fromDateInputValue(data.expectedFirstHarvest),
        status: data.status,
        notes: data.notes?.trim() || '',
      };

      if (isEditMode && editPlanting?.id) {
        await updatePlanting(editPlanting.id, shared);
        onSuccess?.(editPlanting.id);
      } else {
        if (!siteId) {
          setSubmitError('No active site. Set up a site before adding plantings.');
          return;
        }

        const plantingId = await addPlanting({
          ...shared,
          siteId,
          previousPlantingId: sowNextFrom?.id,
        });
        onSuccess?.(plantingId);
      }

      handleClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save planting:', error);
      setSubmitError((error as Error).message || 'Failed to save planting');
    }
  };

  const handleClose = () => {
    reset(emptyDefaults);
    setSubmitError(null);
    onClose();
  };

  const noBedsAvailable = !isEditMode && siteId !== undefined && bedsForSite.length === 0;
  const bedOptionsSource = isEditMode ? beds.filter((b) => b.siteId === editPlanting?.siteId || b.isActive) : bedsForSite;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? `Edit Planting: ${editPlanting?.crop}` : isSuccession ? `Sow Next: ${sowNextFrom?.crop}` : 'New Planting'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEditMode && !activeSite && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
            No active site is set up yet. Set up a site before adding plantings.
          </div>
        )}

        {isSuccession && (
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-sm text-primary-700 dark:text-primary-300">
            Succession of <span className="font-medium">{sowNextFrom?.crop}</span>
            {sowNextFrom?.variety ? ` (${sowNextFrom.variety})` : ''} - the interval will be measured
            against what that planting yielded.
          </div>
        )}

        {/* Crop */}
        <div>
          <label htmlFor="planting-crop" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Crop <span className="text-red-500">*</span>
          </label>
          <input
            id="planting-crop"
            type="text"
            {...register('crop')}
            placeholder="e.g., Carrots, Lettuce"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.crop && <p className="mt-1 text-sm text-red-500">{errors.crop.message}</p>}
        </div>

        {/* Crop guide - collapsed by default, silent when there's no match */}
        <CropGuidePanel cropName={watch('crop')} />

        {/* Variety */}
        <div>
          <label htmlFor="planting-variety" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Variety
          </label>
          <input
            id="planting-variety"
            type="text"
            {...register('variety')}
            placeholder="e.g., Nantes, Cos"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.variety && <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>}
        </div>

        {/* Bed */}
        <div>
          <label htmlFor="planting-bed" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Bed <span className="text-red-500">*</span>
          </label>
          {noBedsAvailable ? (
            <p className="text-sm text-amber-700 dark:text-amber-300 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              No active beds yet. Create a bed before adding a planting.
            </p>
          ) : (
            <select
              id="planting-bed"
              {...register('bedId')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a bed...</option>
              {bedOptionsSource.map((bed) => (
                <option key={bed.id} value={bed.id}>
                  {bed.name}
                </option>
              ))}
            </select>
          )}
          {errors.bedId && <p className="mt-1 text-sm text-red-500">{errors.bedId.message}</p>}
        </div>

        {/* Bed portion */}
        <div>
          <label htmlFor="planting-bed-portion" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Bed portion
          </label>
          <input
            id="planting-bed-portion"
            type="text"
            {...register('bedPortion')}
            placeholder="e.g., north half"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.bedPortion && <p className="mt-1 text-sm text-red-500">{errors.bedPortion.message}</p>}
        </div>

        {/* Method */}
        <div>
          <label htmlFor="planting-method" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Method
          </label>
          <select
            id="planting-method"
            {...register('method')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="direct_sown">Direct sown</option>
            <option value="transplanted">Transplanted</option>
          </select>
        </div>

        {/* Only the date matching the chosen method is shown - showing both invites
            contradictory data. */}
        {method === 'transplanted' ? (
          <div>
            <label htmlFor="planting-date-transplanted" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date transplanted
            </label>
            <input
              id="planting-date-transplanted"
              type="date"
              {...register('dateTransplanted')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="planting-date-sown" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date sown
            </label>
            <input
              id="planting-date-sown"
              type="date"
              {...register('dateSown')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Plant count / spacing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="planting-count" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Plant count
            </label>
            <input
              id="planting-count"
              type="number"
              step="1"
              {...register('plantCount', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.plantCount && <p className="mt-1 text-sm text-red-500">{errors.plantCount.message}</p>}
          </div>
          <div>
            <label htmlFor="planting-spacing" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Spacing (cm)
            </label>
            <input
              id="planting-spacing"
              type="number"
              step="0.5"
              {...register('spacingCm', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.spacingCm && <p className="mt-1 text-sm text-red-500">{errors.spacingCm.message}</p>}
          </div>
        </div>

        {/* Expected first harvest */}
        <div>
          <label htmlFor="planting-expected-harvest" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Expected first harvest
          </label>
          <input
            id="planting-expected-harvest"
            type="date"
            {...register('expectedFirstHarvest')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="planting-status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Status
          </label>
          <select
            id="planting-status"
            {...register('status')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="planned">Planned</option>
            <option value="growing">Growing</option>
            <option value="harvesting">Harvesting</option>
            <option value="finished">Finished</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="planting-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            id="planting-notes"
            {...register('notes')}
            rows={3}
            placeholder="Germination, pests, anything worth remembering..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
        </div>

        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!isEditMode && (!activeSite || noBedsAvailable))}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Planting'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
