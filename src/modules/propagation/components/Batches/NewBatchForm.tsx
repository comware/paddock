/**
 * NewBatchForm - Form for creating a new propagation batch
 *
 * Features:
 * - Searchable species dropdown with recent species
 * - Method selector with all 12 propagation methods
 * - Quantity quick-select buttons (5, 10, 20, 50, 100)
 * - Station selector (required)
 * - Optional mother plant linkage
 * - Optional preparation details
 * - Zod validation
 *
 * UX Target: Batch entry should take <60 seconds
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useBatches } from '../../stores';
import { useSites } from '@/modules/grow/stores';
import { propDb } from '@/lib/db';
import type {
  PropagationMethod,
  PropStation,
  PropMotherPlant,
  PropSpeciesConfig,
} from '../../types';

// ============================================
// PROPAGATION METHODS WITH DESCRIPTIONS
// ============================================

const PROPAGATION_METHODS: Array<{
  value: PropagationMethod;
  label: string;
  category: string;
  description: string;
}> = [
  // Cuttings
  {
    value: 'cutting_softwood',
    label: 'Softwood Cutting',
    category: 'Cuttings',
    description: 'New growth, spring/early summer',
  },
  {
    value: 'cutting_semi_hardwood',
    label: 'Semi-hardwood Cutting',
    category: 'Cuttings',
    description: 'Partially mature, mid-summer to autumn',
  },
  {
    value: 'cutting_hardwood',
    label: 'Hardwood Cutting',
    category: 'Cuttings',
    description: 'Dormant wood, late autumn to winter',
  },
  {
    value: 'cutting_leaf',
    label: 'Leaf Cutting',
    category: 'Cuttings',
    description: 'Single leaves with petiole',
  },
  {
    value: 'cutting_root',
    label: 'Root Cutting',
    category: 'Cuttings',
    description: 'Sections of root material',
  },
  // Division
  {
    value: 'division',
    label: 'Division',
    category: 'Division',
    description: 'Splitting established plants',
  },
  // Layering
  {
    value: 'layering_simple',
    label: 'Simple Layering',
    category: 'Layering',
    description: 'Stem bent to ground and buried',
  },
  {
    value: 'layering_air',
    label: 'Air Layering',
    category: 'Layering',
    description: 'Wrapped aerial portion',
  },
  // Grafting
  {
    value: 'grafting_whip',
    label: 'Whip Grafting',
    category: 'Grafting',
    description: 'Diagonal cuts joined together',
  },
  {
    value: 'grafting_cleft',
    label: 'Cleft Grafting',
    category: 'Grafting',
    description: 'Scion inserted into split rootstock',
  },
  {
    value: 'grafting_bud',
    label: 'Bud Grafting',
    category: 'Grafting',
    description: 'Single bud inserted under bark',
  },
  // Seed
  {
    value: 'seed',
    label: 'Seed',
    category: 'Seed',
    description: 'Growing from seeds',
  },
];

// Group methods by category for display
const METHODS_BY_CATEGORY = PROPAGATION_METHODS.reduce(
  (acc, method) => {
    if (!acc[method.category]) {
      acc[method.category] = [];
    }
    acc[method.category].push(method);
    return acc;
  },
  {} as Record<string, typeof PROPAGATION_METHODS>
);

// ============================================
// COMMON ROOTING MEDIUMS
// ============================================

const ROOTING_MEDIUMS = [
  { value: '', label: 'Select medium...' },
  { value: 'perlite', label: 'Perlite' },
  { value: 'perlite_vermiculite', label: 'Perlite/Vermiculite Mix' },
  { value: 'coarse_sand', label: 'Coarse Sand' },
  { value: 'coco_coir', label: 'Coco Coir' },
  { value: 'peat_moss', label: 'Peat Moss' },
  { value: 'seed_raising_mix', label: 'Seed Raising Mix' },
  { value: 'water', label: 'Water (hydroponics)' },
  { value: 'sphagnum_moss', label: 'Sphagnum Moss' },
  { value: 'rockwool', label: 'Rockwool' },
  { value: 'other', label: 'Other' },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

const batchSchema = z.object({
  species: z.string().min(1, 'Species is required').max(100, 'Species name too long'),
  variety: z.string().max(100, 'Variety name too long').optional(),
  method: z.enum([
    'cutting_softwood',
    'cutting_semi_hardwood',
    'cutting_hardwood',
    'cutting_leaf',
    'cutting_root',
    'division',
    'layering_simple',
    'layering_air',
    'grafting_whip',
    'grafting_cleft',
    'grafting_bud',
    'seed',
  ] as const, {
    required_error: 'Please select a propagation method',
  }),
  quantityStarted: z.number().min(1, 'At least 1 required').max(1000, 'Maximum 1000'),
  stationId: z.string().min(1, 'Station is required'),
  motherPlantId: z.string().optional(),
  dateTaken: z.date(),
  preparationNotes: z.string().max(500, 'Notes too long').optional(),
  rootingMedium: z.string().optional(),
  hormoneUsed: z.string().max(100, 'Hormone name too long').optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

// ============================================
// PROPS
// ============================================

interface NewBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (batchId: string) => void;
}

// ============================================
// QUICK SELECT QUANTITIES
// ============================================

const QUICK_QUANTITIES = [5, 10, 20, 50, 100];

// ============================================
// COMPONENT
// ============================================

export function NewBatchForm({ isOpen, onClose, onSuccess }: NewBatchFormProps) {
  const { addBatch, getUniqueSpecies, getNextBatchNumber } = useBatches();
  const { sites, loadSites, getActiveSite, getDefaultSite } = useSites();

  // Local state for async data
  const [stations, setStations] = useState<PropStation[]>([]);
  const [motherPlants, setMotherPlants] = useState<PropMotherPlant[]>([]);
  const [speciesConfigs, setSpeciesConfigs] = useState<PropSpeciesConfig[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Species search state
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);

  // Get batch store data
  const recentSpecies = getUniqueSpecies();
  const nextBatchNumber = getNextBatchNumber();

  // Active site for filtering
  const activeSite = getActiveSite() || getDefaultSite();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      species: '',
      variety: '',
      method: undefined,
      quantityStarted: 10,
      stationId: '',
      motherPlantId: '',
      dateTaken: new Date(),
      preparationNotes: '',
      rootingMedium: '',
      hormoneUsed: '',
    },
  });

  const selectedSpecies = watch('species');
  const selectedMethod = watch('method');
  const currentQuantity = watch('quantityStarted');
  const selectedStationId = watch('stationId');

  // Load supporting data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        await loadSites();

        // Load stations (filter to active only)
        const allStations = await propDb.stations.toArray();
        const activeStations = allStations.filter((s) => s.isActive);
        setStations(activeStations);

        // Load mother plants (filter to active only)
        const allMotherPlants = await propDb.motherPlants.toArray();
        const activeMotherPlants = allMotherPlants.filter((mp) => mp.status === 'active');
        setMotherPlants(activeMotherPlants);

        // Load species configs for defaults
        const configs = await propDb.speciesConfigs.toArray();
        setSpeciesConfigs(configs);
      } catch (error) {
        console.error('Failed to load form data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadSites]);

  // Update defaults when species changes (from species config)
  useEffect(() => {
    if (selectedSpecies) {
      const config = speciesConfigs.find(
        (c) => c.species.toLowerCase() === selectedSpecies.toLowerCase()
      );
      if (config?.preferredMethod) {
        setValue('method', config.preferredMethod);
      }
    }
  }, [selectedSpecies, speciesConfigs, setValue]);

  // Filter species for dropdown
  const filteredSpecies = useMemo(() => {
    const search = speciesSearch.toLowerCase().trim();
    const allSpecies = [
      ...new Set([
        ...recentSpecies,
        ...speciesConfigs.map((c) => c.species),
        ...motherPlants.map((mp) => mp.species),
      ]),
    ].sort();

    if (!search) {
      return allSpecies.slice(0, 10); // Show top 10 recent
    }

    return allSpecies.filter((s) => s.toLowerCase().includes(search));
  }, [speciesSearch, recentSpecies, speciesConfigs, motherPlants]);

  // Get selected station occupancy info
  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId);
  }, [stations, selectedStationId]);

  // Get mother plants filtered by selected species
  const filteredMotherPlants = useMemo(() => {
    if (!selectedSpecies) return motherPlants;
    return motherPlants.filter(
      (mp) => mp.species.toLowerCase() === selectedSpecies.toLowerCase()
    );
  }, [selectedSpecies, motherPlants]);

  const onSubmit = async (data: BatchFormData) => {
    setSubmitError(null);

    try {
      // Get site ID from active site or default
      const siteId = activeSite?.id;
      if (!siteId) {
        setSubmitError('No site configured. Please set up a site first.');
        return;
      }

      const batchId = await addBatch({
        siteId,
        stationId: data.stationId,
        species: data.species.trim(),
        variety: data.variety?.trim() || undefined,
        method: data.method,
        quantityStarted: data.quantityStarted,
        motherPlantId: data.motherPlantId || undefined,
        dateTaken: data.dateTaken,
        preparationNotes: data.preparationNotes?.trim() || undefined,
        rootingMedium: data.rootingMedium || undefined,
        hormoneUsed: data.hormoneUsed?.trim() || undefined,
        photoUrls: [],
      });

      reset();
      setSpeciesSearch('');
      onSuccess?.(batchId);
      onClose();
    } catch (error) {
      console.error('Failed to add batch:', error);
      setSubmitError((error as Error).message || 'Failed to create batch');
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
    <Modal isOpen={isOpen} onClose={handleClose} title={`New Batch #${nextBatchNumber}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section: Species and Variety */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Plant Information
          </h3>

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
                // Delay to allow click on dropdown
                setTimeout(() => setShowSpeciesDropdown(false), 200);
              }}
              placeholder="Search or type species name..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoadingData}
            />
            {/* Hidden field for validation */}
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
              placeholder="e.g., 'Tuscan Blue', 'Pink Pearl'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.variety && (
              <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>
            )}
          </div>
        </div>

        {/* Section: Method and Source */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Propagation Method
          </h3>

          {/* Method Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Method *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(METHODS_BY_CATEGORY).map(([category, methods]) => (
                <div key={category} className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 mt-2 first:mt-0">
                    {category}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {methods.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setValue('method', method.value)}
                        title={method.description}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                          selectedMethod === method.value
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Hidden field for validation */}
            <input type="hidden" {...register('method')} />
            {errors.method && (
              <p className="mt-1 text-sm text-red-500">{errors.method.message}</p>
            )}
          </div>

          {/* Mother Plant (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mother Plant <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select
              {...register('motherPlantId')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoadingData}
            >
              <option value="">Not from registered mother plant</option>
              {filteredMotherPlants.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.label} ({mp.species}{mp.variety ? ` - ${mp.variety}` : ''})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Link to a registered mother plant for tracking lineage
            </p>
          </div>
        </div>

        {/* Section: Quantity and Station */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Quantity & Location
          </h3>

          {/* Quantity with quick select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity *
            </label>
            <div className="flex gap-2 mb-2">
              {QUICK_QUANTITIES.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setValue('quantityStarted', qty)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentQuantity === qty
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
            <input
              type="number"
              {...register('quantityStarted', { valueAsNumber: true })}
              min={1}
              max={1000}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.quantityStarted && (
              <p className="mt-1 text-sm text-red-500">{errors.quantityStarted.message}</p>
            )}
          </div>

          {/* Station Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Station *
            </label>
            <select
              {...register('stationId')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoadingData || stations.length === 0}
            >
              <option value="">Select station...</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.type.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            {selectedStation && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Capacity: {selectedStation.capacity} slots
                {selectedStation.isIndoor ? ' | Indoor' : ' | Outdoor'}
              </p>
            )}
            {stations.length === 0 && !isLoadingData && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                No active stations found. Please create a station first.
              </p>
            )}
            {errors.stationId && (
              <p className="mt-1 text-sm text-red-500">{errors.stationId.message}</p>
            )}
          </div>

          {/* Date Taken */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date Taken
            </label>
            <Controller
              name="dateTaken"
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
            {errors.dateTaken && (
              <p className="mt-1 text-sm text-red-500">{errors.dateTaken.message}</p>
            )}
          </div>
        </div>

        {/* Section: Optional Details (collapsible feel) */}
        <details className="space-y-4">
          <summary className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
            Optional Details
          </summary>

          <div className="pt-3 space-y-4">
            {/* Rooting Medium */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Rooting Medium
              </label>
              <select
                {...register('rootingMedium')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {ROOTING_MEDIUMS.map((medium) => (
                  <option key={medium.value} value={medium.value}>
                    {medium.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rooting Hormone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Rooting Hormone
              </label>
              <input
                type="text"
                {...register('hormoneUsed')}
                placeholder="e.g., Clonex, Rootone, None"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Preparation Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Preparation Notes
              </label>
              <textarea
                {...register('preparationNotes')}
                rows={3}
                placeholder="Any special preparation, treatment, or observations..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.preparationNotes && (
                <p className="mt-1 text-sm text-red-500">{errors.preparationNotes.message}</p>
              )}
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
            disabled={isSubmitting || isLoadingData}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Batch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
