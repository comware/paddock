/**
 * StationForm - Form for creating/editing propagation stations
 *
 * Features:
 * - Name, type, capacity fields
 * - Indoor/outdoor toggle
 * - Environmental target inputs (auto-filled from type defaults)
 * - Location/description optional fields
 * - Zod validation
 *
 * Follows the NewBatchForm pattern from the propagation module.
 */

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui';
import { useStations, DEFAULT_ENVIRONMENTAL_TARGETS } from '../../stores/useStations';
import { useSites } from '@/modules/grow/stores';
import type { StationType, PropStation } from '../../types';
import {
  RequiredTextField,
  NumericRangeField,
  TextareaField,
  FormError,
  FormActions,
  FormSectionHeader,
} from '../shared/FormFields';

// ============================================
// STATION TYPE OPTIONS
// ============================================

const STATION_TYPES: Array<{
  value: StationType;
  label: string;
  description: string;
}> = [
  {
    value: 'heated_propagator',
    label: 'Heated Propagator',
    description: 'Electric bottom heat, high humidity',
  },
  {
    value: 'unheated_propagator',
    label: 'Unheated Propagator',
    description: 'Plastic dome without heating',
  },
  {
    value: 'water_propagation',
    label: 'Water Propagation',
    description: 'Rooting directly in water',
  },
  {
    value: 'outdoor_bed',
    label: 'Outdoor Bed',
    description: 'Open ground or raised bed',
  },
  {
    value: 'cold_frame',
    label: 'Cold Frame',
    description: 'Unheated glazed structure',
  },
  {
    value: 'greenhouse_bench',
    label: 'Greenhouse Bench',
    description: 'Controlled environment bench',
  },
  {
    value: 'mist_system',
    label: 'Mist System',
    description: 'Automated intermittent misting',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Custom propagation setup',
  },
];

// ============================================
// VALIDATION SCHEMA
// ============================================

const stationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type: z.enum([
    'heated_propagator',
    'unheated_propagator',
    'water_propagation',
    'outdoor_bed',
    'cold_frame',
    'greenhouse_bench',
    'mist_system',
    'other',
  ] as const, {
    message: 'Please select a station type',
  }),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(10000, 'Maximum 10,000'),
  isIndoor: z.boolean(),
  description: z.string().max(500, 'Description too long').optional(),
  targetTempMin: z.number().min(-40).max(60).optional(),
  targetTempMax: z.number().min(-40).max(60).optional(),
  targetHumidityMin: z.number().min(0).max(100).optional(),
  targetHumidityMax: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    if (data.targetTempMin !== undefined && data.targetTempMax !== undefined) {
      return data.targetTempMin <= data.targetTempMax;
    }
    return true;
  },
  {
    message: 'Min temperature cannot exceed max temperature',
    path: ['targetTempMin'],
  }
).refine(
  (data) => {
    if (data.targetHumidityMin !== undefined && data.targetHumidityMax !== undefined) {
      return data.targetHumidityMin <= data.targetHumidityMax;
    }
    return true;
  },
  {
    message: 'Min humidity cannot exceed max humidity',
    path: ['targetHumidityMin'],
  }
);

type StationFormData = z.infer<typeof stationSchema>;

// ============================================
// PROPS
// ============================================

interface StationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (stationId: string) => void;
  editStation?: PropStation; // If provided, form is in edit mode
}

// ============================================
// QUICK SELECT CAPACITIES
// ============================================

const QUICK_CAPACITIES = [10, 25, 50, 100, 200];

// ============================================
// COMPONENT
// ============================================

export function StationForm({ isOpen, onClose, onSuccess, editStation }: StationFormProps) {
  const { addStation, updateStation } = useStations();
  const { getActiveSite, getDefaultSite, loadSites } = useSites();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAdvancedEnv, setShowAdvancedEnv] = useState(false);

  const isEditMode = !!editStation;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      type: undefined,
      capacity: 25,
      isIndoor: true,
      description: '',
      targetTempMin: undefined,
      targetTempMax: undefined,
      targetHumidityMin: undefined,
      targetHumidityMax: undefined,
    },
  });

  const selectedType = watch('type');
  const currentCapacity = watch('capacity');

  // Load sites on mount
  useEffect(() => {
    if (isOpen) {
      loadSites();
    }
  }, [isOpen, loadSites]);

  // Reset form when opening with edit data
  useEffect(() => {
    if (isOpen && editStation) {
      reset({
        name: editStation.name,
        type: editStation.type,
        capacity: editStation.capacity,
        isIndoor: editStation.isIndoor,
        description: editStation.description || '',
        targetTempMin: editStation.targetTempMin,
        targetTempMax: editStation.targetTempMax,
        targetHumidityMin: editStation.targetHumidityMin,
        targetHumidityMax: editStation.targetHumidityMax,
      });
      // Show advanced if there are environmental targets
      if (editStation.targetTempMin !== undefined || editStation.targetHumidityMin !== undefined) {
        setShowAdvancedEnv(true);
      }
    } else if (isOpen && !editStation) {
      reset({
        name: '',
        type: undefined,
        capacity: 25,
        isIndoor: true,
        description: '',
        targetTempMin: undefined,
        targetTempMax: undefined,
        targetHumidityMin: undefined,
        targetHumidityMax: undefined,
      });
      setShowAdvancedEnv(false);
    }
  }, [isOpen, editStation, reset]);

  // Apply default environmental targets when type changes (only in create mode)
  useEffect(() => {
    if (selectedType && !isEditMode) {
      const defaults = DEFAULT_ENVIRONMENTAL_TARGETS[selectedType];
      if (defaults) {
        setValue('targetTempMin', defaults.tempMin);
        setValue('targetTempMax', defaults.tempMax);
        setValue('targetHumidityMin', defaults.humidityMin);
        setValue('targetHumidityMax', defaults.humidityMax);
      }
    }
  }, [selectedType, setValue, isEditMode]);

  const onSubmit = async (data: StationFormData) => {
    setSubmitError(null);

    try {
      const activeSite = getActiveSite() || getDefaultSite();
      if (!activeSite?.id) {
        setSubmitError('No site configured. Please set up a site first.');
        return;
      }

      if (isEditMode && editStation?.id) {
        // Update existing station
        await updateStation(editStation.id, {
          name: data.name.trim(),
          type: data.type,
          capacity: data.capacity,
          isIndoor: data.isIndoor,
          description: data.description?.trim() || undefined,
          targetTempMin: data.targetTempMin,
          targetTempMax: data.targetTempMax,
          targetHumidityMin: data.targetHumidityMin,
          targetHumidityMax: data.targetHumidityMax,
        });
        onSuccess?.(editStation.id);
      } else {
        // Create new station
        const stationId = await addStation({
          siteId: activeSite.id,
          name: data.name.trim(),
          type: data.type,
          capacity: data.capacity,
          isIndoor: data.isIndoor,
          isActive: true,
          description: data.description?.trim() || undefined,
          targetTempMin: data.targetTempMin,
          targetTempMax: data.targetTempMax,
          targetHumidityMin: data.targetHumidityMin,
          targetHumidityMax: data.targetHumidityMax,
        });
        onSuccess?.(stationId);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to save station:', error);
      setSubmitError((error as Error).message || 'Failed to save station');
    }
  };

  const handleClose = () => {
    reset();
    setSubmitError(null);
    setShowAdvancedEnv(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? `Edit Station: ${editStation?.name}` : 'New Station'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section: Basic Info */}
        <div className="space-y-4">
          <FormSectionHeader title="Station Information" />

          <RequiredTextField
            label="Name"
            registration={register('name')}
            error={errors.name}
            placeholder="e.g., Main Propagator, South Bench"
          />

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue('type', type.value)}
                  title={type.description}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    selectedType === type.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <input type="hidden" {...register('type')} />
            {errors.type && (
              <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          {/* Capacity with quick select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Capacity (slots) *
            </label>
            <div className="flex gap-2 mb-2">
              {QUICK_CAPACITIES.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setValue('capacity', cap)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentCapacity === cap
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
            <input
              type="number"
              {...register('capacity', { valueAsNumber: true })}
              min={1}
              max={10000}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-500">{errors.capacity.message}</p>
            )}
          </div>

          {/* Indoor/Outdoor Toggle */}
          <div className="flex items-center gap-4">
            <Controller
              name="isIndoor"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Indoor Station
                  </span>
                </label>
              )}
            />
          </div>

          <TextareaField
            label="Description"
            registration={register('description')}
            error={errors.description}
            placeholder="Location details, equipment notes..."
          />
        </div>

        {/* Section: Environmental Targets (collapsible) */}
        <details open={showAdvancedEnv} onToggle={(e) => setShowAdvancedEnv((e.target as HTMLDetailsElement).open)}>
          <summary className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
            Environmental Targets
          </summary>

          <div className="pt-3 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target ranges for monitoring. Auto-filled based on station type.
            </p>

            {/* Temperature Range */}
            <div className="grid grid-cols-2 gap-4">
              <NumericRangeField label="Min Temp (C)" registration={register('targetTempMin', { valueAsNumber: true })} error={errors.targetTempMin} min={-40} max={60} />
              <NumericRangeField label="Max Temp (C)" registration={register('targetTempMax', { valueAsNumber: true })} error={errors.targetTempMax} min={-40} max={60} />
            </div>

            {/* Humidity Range */}
            <div className="grid grid-cols-2 gap-4">
              <NumericRangeField label="Min Humidity (%)" registration={register('targetHumidityMin', { valueAsNumber: true })} error={errors.targetHumidityMin} min={0} max={100} />
              <NumericRangeField label="Max Humidity (%)" registration={register('targetHumidityMax', { valueAsNumber: true })} error={errors.targetHumidityMax} min={0} max={100} />
            </div>
          </div>
        </details>

        <FormError message={submitError} />

        <FormActions
          onCancel={handleClose}
          isSubmitting={isSubmitting}
          submitLabel={isEditMode ? 'Save Changes' : 'Create Station'}
          submittingLabel="Saving..."
        />
      </form>
    </Modal>
  );
}
