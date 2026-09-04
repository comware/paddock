/** NewBatchForm - Form for creating a new propagation batch. */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui';
import { useBatches } from '../../stores';
import { useSites } from '@/modules/microgreens/stores';
import { propDb } from '@/lib/db';
import type { PropStation, PropMotherPlant, PropSpeciesConfig } from '../../types';
import { batchSchema, type BatchFormData } from './batchFormConstants';
import { BatchBasicInfo } from './BatchBasicInfo';
import { BatchStageConfig } from './BatchStageConfig';
import { BatchQuantitySection, BatchOptionalDetails } from './BatchQuantitySection';

interface NewBatchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (batchId: string) => void;
  prefillMotherPlantId?: string;
  prefillSpecies?: string;
  prefillVariety?: string;
}

export function NewBatchForm({
  isOpen,
  onClose,
  onSuccess,
  prefillMotherPlantId,
  prefillSpecies,
  prefillVariety,
}: NewBatchFormProps) {
  const { addBatch, getUniqueSpecies, getNextBatchNumber } = useBatches();
  const { loadSites, getActiveSite, getDefaultSite } = useSites();

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

  const selectedSpeciesConfig = useMemo(() => {
    if (!selectedSpecies) return null;
    return speciesConfigs.find(
      (c) => c.species.toLowerCase() === selectedSpecies.toLowerCase()
    ) ?? null;
  }, [selectedSpecies, speciesConfigs]);

  const isInSeason = useMemo(() => {
    if (!selectedSpeciesConfig?.bestPropagationMonths?.length) return true;
    const currentMonth = new Date().getMonth() + 1;
    return selectedSpeciesConfig.bestPropagationMonths.includes(currentMonth);
  }, [selectedSpeciesConfig]);

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        await loadSites();
        const allStations = await propDb.stations.toArray();
        setStations(allStations.filter((s) => s.isActive));
        const allMotherPlants = await propDb.motherPlants.toArray();
        setMotherPlants(allMotherPlants.filter((mp) => mp.status === 'active'));
        setSpeciesConfigs(await propDb.speciesConfigs.toArray());
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to load form data:', error);
        setSubmitError('Failed to load form data. Please close and try again.');
      } finally {
        setIsLoadingData(false);
      }
    }
    if (isOpen) loadData();
  }, [isOpen, loadSites]);

  useEffect(() => {
    if (isOpen && (prefillMotherPlantId || prefillSpecies)) {
      if (prefillSpecies) {
        setValue('species', prefillSpecies);
        setSpeciesSearch(prefillSpecies);
      }
      if (prefillVariety) {
        setValue('variety', prefillVariety);
      }
      if (prefillMotherPlantId) {
        setValue('motherPlantId', prefillMotherPlantId);
      }
    }
  }, [isOpen, prefillMotherPlantId, prefillSpecies, prefillVariety, setValue]);

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
      return allSpecies.slice(0, 10);
    }

    return allSpecies.filter((s) => s.toLowerCase().includes(search));
  }, [speciesSearch, recentSpecies, speciesConfigs, motherPlants]);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId);
  }, [stations, selectedStationId]);

  const filteredMotherPlants = useMemo(() => {
    if (!selectedSpecies) return motherPlants;
    return motherPlants.filter(
      (mp) => mp.species.toLowerCase() === selectedSpecies.toLowerCase()
    );
  }, [selectedSpecies, motherPlants]);

  const onSubmit = async (data: BatchFormData) => {
    setSubmitError(null);

    try {
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
      if (import.meta.env.DEV) console.error('Failed to add batch:', error);
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

  const handleSpeciesSearchChange = (value: string) => {
    setSpeciesSearch(value);
    setValue('species', value);
    setShowSpeciesDropdown(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`New Batch #${nextBatchNumber}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <BatchBasicInfo
          speciesSearch={speciesSearch}
          onSpeciesSearchChange={handleSpeciesSearchChange}
          showSpeciesDropdown={showSpeciesDropdown}
          onShowSpeciesDropdown={setShowSpeciesDropdown}
          filteredSpecies={filteredSpecies}
          onSpeciesSelect={handleSpeciesSelect}
          selectedSpeciesConfig={selectedSpeciesConfig}
          isInSeason={isInSeason}
          isLoadingData={isLoadingData}
          register={register}
          errors={errors}
        />

        <BatchStageConfig
          selectedMethod={selectedMethod}
          filteredMotherPlants={filteredMotherPlants}
          isLoadingData={isLoadingData}
          register={register}
          setValue={setValue}
          errors={errors}
        />

        <BatchQuantitySection
          currentQuantity={currentQuantity}
          stations={stations}
          selectedStation={selectedStation}
          isLoadingData={isLoadingData}
          register={register}
          setValue={setValue}
          control={control}
          errors={errors}
        />

        <BatchOptionalDetails register={register} errors={errors} />

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
