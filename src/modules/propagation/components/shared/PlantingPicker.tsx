/**
 * PlantingPicker - optional select of tracked vegetable plantings for a graduation.
 *
 * `planted_garden` has always taken free text (plantedLocation). Now that vegetables
 * exists, a grower who tracks beds can point the graduation at the real planting row
 * instead, closing the loop through to the picks that come off it.
 *
 * This is a deliberate cross-module import (propagation -> vegetables) - the dependency
 * points the direction the design calls for. Only rendered when the vegetables module is
 * enabled, so a grower who does not run vegetables sees nothing extra.
 */

import { useEffect, useMemo } from 'react';
import { useModulesStore } from '@/stores/useModulesStore';
import { usePlantings, useBeds } from '@/modules/vegetables/stores';

const LABEL_CLASSES = 'block text-sm text-slate-600 dark:text-slate-400 mb-1';
const SELECT_CLASSES =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent';

export interface PlantingPickerProps {
  /** Restrict the options to plantings at this site. */
  siteId?: string;
  /** The currently selected planting id, if any. */
  value: string | undefined;
  /** Called with the new planting id, or undefined when cleared. */
  onChange: (plantingId: string | undefined) => void;
}

export function PlantingPicker({ siteId, value, onChange }: PlantingPickerProps) {
  const vegetablesEnabled = useModulesStore((s) => s.isEnabled('vegetables'));
  const plantings = usePlantings((s) => s.plantings);
  const beds = useBeds((s) => s.beds);
  const loadPlantings = usePlantings((s) => s.loadPlantings);
  const loadBeds = useBeds((s) => s.loadBeds);

  useEffect(() => {
    if (!vegetablesEnabled) return;
    loadPlantings();
    loadBeds();
  }, [vegetablesEnabled, loadPlantings, loadBeds]);

  const options = useMemo(() => {
    if (!vegetablesEnabled) return [];
    return plantings
      .filter((p) => p.status !== 'finished' && p.status !== 'failed')
      .filter((p) => !siteId || p.siteId === siteId)
      .map((p) => {
        const bed = beds.find((b) => b.id === p.bedId);
        const label = [p.crop, p.variety, bed?.name].filter(Boolean).join(', ');
        return { id: p.id as string, label };
      });
  }, [vegetablesEnabled, plantings, beds, siteId]);

  if (!vegetablesEnabled) {
    return null;
  }

  return (
    <div>
      <label className={LABEL_CLASSES}>
        Planted as <span className="text-slate-400 font-normal">(optional)</span>
      </label>
      {options.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No tracked plantings yet — use the note below for where it went.
        </p>
      ) : (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={SELECT_CLASSES}
        >
          <option value="">None — use the note below</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
