/**
 * MotherPlantForm - Form for registering and editing mother plants
 *
 * Features:
 * - Fields: species, variety, acquisition date, acquisition method, source, location, notes
 * - Acquisition methods: purchased, propagated, gifted, found, other
 * - Photo upload placeholder
 * - Validation with Zod
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useSites } from '@/modules/grow/stores';
import { useMotherPlants, useBatches } from '../../stores';
import type { AcquisitionMethod, PropMotherPlant } from '../../types';

// ============================================
// ACQUISITION METHODS
// ============================================

const ACQUISITION_METHODS: Array<{
  value: AcquisitionMethod;
  label: string;
  description: string;
}> = [
  { value: 'purchased', label: 'Purchased', description: 'Bought from nursery or seller' },
  { value: 'propagated', label: 'Propagated', description: 'Grown from your own propagation' },
  { value: 'gifted', label: 'Gifted', description: 'Received as a gift' },
  { value: 'wild_collected', label: 'Wild Collected', description: 'Collected from the wild' },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

const motherPlantSchema = z.object({
  species: z.string().min(1, 'Species is required').max(100, 'Species name too long'),
  variety: z.string().max(100, 'Variety name too long').optional(),
  scientificName: z.string().max(150, 'Scientific name too long').optional(),
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  acquisitionDate: z.date(),
  acquisitionMethod: z.enum(['purchased', 'propagated', 'gifted', 'wild_collected'] as const, {
    message: 'Please select how you acquired this plant',
  }),
  acquisitionSource: z.string().max(200, 'Source too long').optional(),
  acquisitionCost: z.number().min(0, 'Cost cannot be negative').optional().nullable(),
  location: z.string().max(200, 'Location too long').optional(),
  estimatedAge: z.number().int().min(0, 'Age cannot be negative').optional().nullable(),
  propagationNotes: z.string().max(1000, 'Notes too long').optional(),
});

type MotherPlantFormData = z.infer<typeof motherPlantSchema>;

// ============================================
// PROPS
// ============================================

interface MotherPlantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plantId: string) => void;
  editingPlant?: PropMotherPlant | null;
}

// ============================================
// COMPONENT
// ============================================

export function MotherPlantForm({
  isOpen,
  onClose,
  onSuccess,
  editingPlant,
}: MotherPlantFormProps) {
  const { addMotherPlant, updateMotherPlant, getUniqueSpecies } = useMotherPlants();
  const { getUniqueSpecies: getBatchSpecies } = useBatches();
  const { getActiveSite, getDefaultSite, loadSites } = useSites();

  // Species search state
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active site for siteId
  const activeSite = getActiveSite() || getDefaultSite();

  // Get species list from both mother plants and batches
  const motherPlantSpecies = getUniqueSpecies();
  const batchSpecies = getBatchSpecies();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MotherPlantFormData>({
    resolver: zodResolver(motherPlantSchema),
    defaultValues: {
      species: '',
      variety: '',
      scientificName: '',
      label: '',
      acquisitionDate: new Date(),
      acquisitionMethod: undefined,
      acquisitionSource: '',
      acquisitionCost: null,
      location: '',
      estimatedAge: null,
      propagationNotes: '',
    },
  });

  const selectedMethod = watch('acquisitionMethod');

  // Reset form when opening/closing or when editing plant changes
  useEffect(() => {
    if (isOpen) {
      loadSites();
      if (editingPlant) {
        reset({
          species: editingPlant.species,
          variety: editingPlant.variety || '',
          scientificName: editingPlant.scientificName || '',
          label: editingPlant.label,
          acquisitionDate: new Date(editingPlant.acquisitionDate),
          acquisitionMethod: editingPlant.acquisitionMethod,
          acquisitionSource: editingPlant.acquisitionSource || '',
          acquisitionCost: editingPlant.acquisitionCost ?? null,
          location: editingPlant.location || '',
          estimatedAge: editingPlant.estimatedAge ?? null,
          propagationNotes: editingPlant.propagationNotes || '',
        });
        setSpeciesSearch(editingPlant.species);
      } else {
        reset({
          species: '',
          variety: '',
          scientificName: '',
          label: '',
          acquisitionDate: new Date(),
          acquisitionMethod: undefined,
          acquisitionSource: '',
          acquisitionCost: null,
          location: '',
          estimatedAge: null,
          propagationNotes: '',
        });
        setSpeciesSearch('');
      }
      setSubmitError(null);
    }
  }, [isOpen, editingPlant, reset, loadSites]);

  // Filter species for dropdown
  const filteredSpecies = useMemo(() => {
    const search = speciesSearch.toLowerCase().trim();
    const allSpecies = [...new Set([...motherPlantSpecies, ...batchSpecies])].sort();

    if (!search) {
      return allSpecies.slice(0, 10);
    }

    return allSpecies.filter((s) => s.toLowerCase().includes(search));
  }, [speciesSearch, motherPlantSpecies, batchSpecies]);

  const onSubmit = async (data: MotherPlantFormData) => {
    setSubmitError(null);

    try {
      const siteId = activeSite?.id;
      if (!siteId) {
        setSubmitError('No site configured. Please set up a site first.');
        return;
      }

      if (editingPlant?.id) {
        // Update existing
        await updateMotherPlant(editingPlant.id, {
          species: data.species.trim(),
          variety: data.variety?.trim() || undefined,
          scientificName: data.scientificName?.trim() || undefined,
          label: data.label.trim(),
          acquisitionDate: data.acquisitionDate,
          acquisitionMethod: data.acquisitionMethod,
          acquisitionSource: data.acquisitionSource?.trim() || undefined,
          acquisitionCost: data.acquisitionCost ?? undefined,
          location: data.location?.trim() || undefined,
          estimatedAge: data.estimatedAge ?? undefined,
          propagationNotes: data.propagationNotes?.trim() || undefined,
        });
        onSuccess?.(editingPlant.id);
      } else {
        // Create new
        const plantId = await addMotherPlant({
          siteId,
          species: data.species.trim(),
          variety: data.variety?.trim() || undefined,
          scientificName: data.scientificName?.trim() || undefined,
          label: data.label.trim(),
          acquisitionDate: data.acquisitionDate,
          acquisitionMethod: data.acquisitionMethod,
          acquisitionSource: data.acquisitionSource?.trim() || undefined,
          acquisitionCost: data.acquisitionCost ?? undefined,
          location: data.location?.trim() || undefined,
          estimatedAge: data.estimatedAge ?? undefined,
          propagationNotes: data.propagationNotes?.trim() || undefined,
        });
        onSuccess?.(plantId);
      }

      reset();
      setSpeciesSearch('');
      onClose();
    } catch (error) {
      console.error('Failed to save mother plant:', error);
      setSubmitError((error as Error).message || 'Failed to save mother plant');
    }
  };

  const handleClose = () => {
    reset();
    setSpeciesSearch('');
    setSubmitError(null);
    setShowSpeciesDropdown(false);
    onClose();
  };

  const handleSpeciesSelect = (species: string) => {
    setValue('species', species);
    setSpeciesSearch(species);
    setShowSpeciesDropdown(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingPlant ? 'Edit Mother Plant' : 'Register Mother Plant'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section: Plant Identification */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Plant Identification
          </h3>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Label *
            </label>
            <input
              type="text"
              {...register('label')}
              placeholder="e.g., 'Kitchen Rosemary', 'Main Fig'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A unique name to identify this plant
            </p>
            {errors.label && (
              <p className="mt-1 text-sm text-red-500">{errors.label.message}</p>
            )}
          </div>

          {/* Species - Searchable */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Species *
            </label>
            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => {
                setSpeciesSearch(e.target.value);
                setValue('species', e.target.value);
                setShowSpeciesDropdown(true);
              }}
              onFocus={() => setShowSpeciesDropdown(true)}
              onBlur={() => {
                setTimeout(() => setShowSpeciesDropdown(false), 200);
              }}
              placeholder="Search or type species name..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input type="hidden" {...register('species')} />

            {/* Dropdown */}
            {showSpeciesDropdown && filteredSpecies.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredSpecies.map((species) => (
                  <button
                    key={species}
                    type="button"
                    onClick={() => handleSpeciesSelect(species)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                  >
                    {species}
                  </button>
                ))}
                {speciesSearch && !filteredSpecies.includes(speciesSearch) && (
                  <button
                    type="button"
                    onClick={() => handleSpeciesSelect(speciesSearch)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-primary-600 dark:text-primary-400 font-medium border-t border-slate-200 dark:border-slate-600"
                  >
                    + Add "{speciesSearch}" as new species
                  </button>
                )}
              </div>
            )}
            {errors.species && (
              <p className="mt-1 text-sm text-red-500">{errors.species.message}</p>
            )}
          </div>

          {/* Variety */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Variety <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              {...register('variety')}
              placeholder="e.g., 'Tuscan Blue', 'Brown Turkey'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.variety && (
              <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>
            )}
          </div>

          {/* Scientific Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Scientific Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              {...register('scientificName')}
              placeholder="e.g., 'Rosmarinus officinalis'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent italic"
            />
            {errors.scientificName && (
              <p className="mt-1 text-sm text-red-500">{errors.scientificName.message}</p>
            )}
          </div>
        </div>

        {/* Section: Acquisition */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Acquisition Details
          </h3>

          {/* Acquisition Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              How did you acquire this plant? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACQUISITION_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setValue('acquisitionMethod', method.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    selectedMethod === method.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <div>{method.label}</div>
                  <div className="text-xs opacity-75">{method.description}</div>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('acquisitionMethod')} />
            {errors.acquisitionMethod && (
              <p className="mt-1 text-sm text-red-500">{errors.acquisitionMethod.message}</p>
            )}
          </div>

          {/* Acquisition Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Acquisition Date
            </label>
            <Controller
              name="acquisitionDate"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              )}
            />
            {errors.acquisitionDate && (
              <p className="mt-1 text-sm text-red-500">{errors.acquisitionDate.message}</p>
            )}
          </div>

          {/* Acquisition Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Source <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              {...register('acquisitionSource')}
              placeholder="e.g., 'Local nursery', 'Friend's garden', 'Bunnings'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.acquisitionSource && (
              <p className="mt-1 text-sm text-red-500">{errors.acquisitionSource.message}</p>
            )}
          </div>

          {/* Acquisition Cost */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cost <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('acquisitionCost', { valueAsNumber: true })}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            {errors.acquisitionCost && (
              <p className="mt-1 text-sm text-red-500">{errors.acquisitionCost.message}</p>
            )}
          </div>
        </div>

        {/* Section: Location and Details */}
        <details className="space-y-4">
          <summary className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
            Additional Details
          </summary>

          <div className="pt-3 space-y-4">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                {...register('location')}
                placeholder="e.g., 'Back garden, near shed', 'Greenhouse bench 3'"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location.message}</p>
              )}
            </div>

            {/* Estimated Age */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Age (months)
              </label>
              <input
                type="number"
                min="0"
                {...register('estimatedAge', { valueAsNumber: true })}
                placeholder="e.g., 24"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Approximate age when acquired
              </p>
              {errors.estimatedAge && (
                <p className="mt-1 text-sm text-red-500">{errors.estimatedAge.message}</p>
              )}
            </div>

            {/* Propagation Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                {...register('propagationNotes')}
                rows={3}
                placeholder="Any notes about this plant, its propagation preferences, or history..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.propagationNotes && (
                <p className="mt-1 text-sm text-red-500">{errors.propagationNotes.message}</p>
              )}
            </div>

            {/* Photo Upload Placeholder */}
            <div className="p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
              <div className="text-slate-400 dark:text-slate-500 text-sm">
                Photo upload coming soon
              </div>
            </div>
          </div>
        </details>

        {/* Error Display */}
        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
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
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? 'Saving...'
              : editingPlant
                ? 'Save Changes'
                : 'Register Plant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
