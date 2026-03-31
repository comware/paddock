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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui';
import { useSites } from '@/modules/grow/stores';
import { useMotherPlants, useBatches } from '../../stores';
import type { PropMotherPlant } from '../../types';
import { motherPlantSchema, type MotherPlantFormData } from './motherPlantConstants';
import { MotherPlantAcquisitionFields } from './MotherPlantAcquisitionFields';
import { MotherPlantAdditionalDetails } from './MotherPlantAdditionalDetails';

interface MotherPlantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plantId: string) => void;
  editingPlant?: PropMotherPlant | null;
}

export function MotherPlantForm({
  isOpen,
  onClose,
  onSuccess,
  editingPlant,
}: MotherPlantFormProps) {
  const { addMotherPlant, updateMotherPlant, getUniqueSpecies } = useMotherPlants();
  const { getUniqueSpecies: getBatchSpecies } = useBatches();
  const { getActiveSite, getDefaultSite, loadSites } = useSites();

  const [speciesSearch, setSpeciesSearch] = useState('');
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeSite = getActiveSite() || getDefaultSite();
  const motherPlantSpecies = getUniqueSpecies();
  const batchSpecies = getBatchSpecies();

  const {
    register, handleSubmit, watch, setValue, reset, control,
    formState: { errors, isSubmitting },
  } = useForm<MotherPlantFormData>({
    resolver: zodResolver(motherPlantSchema),
    defaultValues: {
      species: '', variety: '', scientificName: '', label: '',
      acquisitionDate: new Date(), acquisitionMethod: undefined,
      acquisitionSource: '', acquisitionCost: null,
      location: '', estimatedAge: null, propagationNotes: '',
    },
  });

  const selectedMethod = watch('acquisitionMethod');

  useEffect(() => {
    if (isOpen) {
      loadSites();
      if (editingPlant) {
        reset({
          species: editingPlant.species, variety: editingPlant.variety || '',
          scientificName: editingPlant.scientificName || '', label: editingPlant.label,
          acquisitionDate: new Date(editingPlant.acquisitionDate),
          acquisitionMethod: editingPlant.acquisitionMethod,
          acquisitionSource: editingPlant.acquisitionSource || '',
          acquisitionCost: editingPlant.acquisitionCost ?? null,
          location: editingPlant.location || '', estimatedAge: editingPlant.estimatedAge ?? null,
          propagationNotes: editingPlant.propagationNotes || '',
        });
        setSpeciesSearch(editingPlant.species);
      } else {
        reset({
          species: '', variety: '', scientificName: '', label: '',
          acquisitionDate: new Date(), acquisitionMethod: undefined,
          acquisitionSource: '', acquisitionCost: null,
          location: '', estimatedAge: null, propagationNotes: '',
        });
        setSpeciesSearch('');
      }
      setSubmitError(null);
    }
  }, [isOpen, editingPlant, reset, loadSites]);

  const filteredSpecies = useMemo(() => {
    const search = speciesSearch.toLowerCase().trim();
    const allSpecies = [...new Set([...motherPlantSpecies, ...batchSpecies])].sort();
    if (!search) return allSpecies.slice(0, 10);
    return allSpecies.filter((s) => s.toLowerCase().includes(search));
  }, [speciesSearch, motherPlantSpecies, batchSpecies]);

  const onSubmit = async (data: MotherPlantFormData) => {
    setSubmitError(null);
    try {
      const siteId = activeSite?.id;
      if (!siteId) { setSubmitError('No site configured. Please set up a site first.'); return; }

      const cleanedData = {
        species: data.species.trim(), variety: data.variety?.trim() || undefined,
        scientificName: data.scientificName?.trim() || undefined, label: data.label.trim(),
        acquisitionDate: data.acquisitionDate, acquisitionMethod: data.acquisitionMethod,
        acquisitionSource: data.acquisitionSource?.trim() || undefined,
        acquisitionCost: data.acquisitionCost ?? undefined,
        location: data.location?.trim() || undefined, estimatedAge: data.estimatedAge ?? undefined,
        propagationNotes: data.propagationNotes?.trim() || undefined,
      };

      if (editingPlant?.id) {
        await updateMotherPlant(editingPlant.id, cleanedData);
        onSuccess?.(editingPlant.id);
      } else {
        const plantId = await addMotherPlant({ siteId, ...cleanedData });
        onSuccess?.(plantId);
      }
      reset();
      setSpeciesSearch('');
      onClose();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save mother plant:', error);
      setSubmitError((error as Error).message || 'Failed to save mother plant');
    }
  };

  const handleClose = () => {
    reset(); setSpeciesSearch(''); setSubmitError(null); setShowSpeciesDropdown(false); onClose();
  };

  const handleSpeciesSelect = (species: string) => {
    setValue('species', species); setSpeciesSearch(species); setShowSpeciesDropdown(false);
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
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label *</label>
            <input type="text" {...register('label')} placeholder="e.g., 'Kitchen Rosemary', 'Main Fig'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A unique name to identify this plant</p>
            {errors.label && <p className="mt-1 text-sm text-red-500">{errors.label.message}</p>}
          </div>

          {/* Species - Searchable */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Species *</label>
            <input type="text" value={speciesSearch}
              onChange={(e) => { setSpeciesSearch(e.target.value); setValue('species', e.target.value); setShowSpeciesDropdown(true); }}
              onFocus={() => setShowSpeciesDropdown(true)}
              onBlur={() => { setTimeout(() => setShowSpeciesDropdown(false), 200); }}
              placeholder="Search or type species name..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            <input type="hidden" {...register('species')} />
            {showSpeciesDropdown && filteredSpecies.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                {filteredSpecies.map((species) => (
                  <button key={species} type="button" onClick={() => handleSpeciesSelect(species)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white">{species}</button>
                ))}
                {speciesSearch && !filteredSpecies.includes(speciesSearch) && (
                  <button type="button" onClick={() => handleSpeciesSelect(speciesSearch)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-600 text-primary-600 dark:text-primary-400 font-medium border-t border-slate-200 dark:border-slate-600">
                    + Add "{speciesSearch}" as new species
                  </button>
                )}
              </div>
            )}
            {errors.species && <p className="mt-1 text-sm text-red-500">{errors.species.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variety <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" {...register('variety')} placeholder="e.g., 'Tuscan Blue', 'Brown Turkey'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            {errors.variety && <p className="mt-1 text-sm text-red-500">{errors.variety.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Scientific Name <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" {...register('scientificName')} placeholder="e.g., 'Rosmarinus officinalis'"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent italic" />
            {errors.scientificName && <p className="mt-1 text-sm text-red-500">{errors.scientificName.message}</p>}
          </div>
        </div>

        <MotherPlantAcquisitionFields
          selectedMethod={selectedMethod}
          onSelectMethod={(method) => setValue('acquisitionMethod', method)}
          methodRegistration={register('acquisitionMethod')}
          methodError={errors.acquisitionMethod}
          control={control}
          dateError={errors.acquisitionDate}
          sourceRegistration={register('acquisitionSource')}
          sourceError={errors.acquisitionSource}
          costRegistration={register('acquisitionCost', { valueAsNumber: true })}
          costError={errors.acquisitionCost}
        />

        <MotherPlantAdditionalDetails
          locationRegistration={register('location')}
          locationError={errors.location}
          estimatedAgeRegistration={register('estimatedAge', { valueAsNumber: true })}
          estimatedAgeError={errors.estimatedAge}
          notesRegistration={register('propagationNotes')}
          notesError={errors.propagationNotes}
        />

        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isSubmitting ? 'Saving...' : editingPlant ? 'Save Changes' : 'Register Plant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
