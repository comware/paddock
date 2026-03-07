/**
 * PropaguleUpdateFields - Health, measurement, and notes fields for propagule updates
 *
 * Extracted from PropaguleUpdateForm to reduce component size.
 * Contains HealthScoreSelector, MeasurementField, and the update mode form layout.
 */

/**
 * Health score selector component.
 */
function HealthScoreSelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (score: number) => void;
}) {
  const scores = [1, 2, 3, 4, 5];
  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Health Score
      </label>
      <div className="flex gap-2">
        {scores.map((score, index) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-colors ${
              value === score
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title={labels[index]}
          >
            <div className="text-lg font-bold">{score}</div>
            <div className="text-xs truncate">{labels[index]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Measurement input field component.
 */
function MeasurementField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? undefined : Number(val));
          }}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400 w-12">{unit}</span>
      </div>
    </div>
  );
}

interface PropaguleUpdateFieldsProps {
  label: string;
  onLabelChange: (value: string) => void;
  healthScore: number | undefined;
  onHealthScoreChange: (score: number) => void;
  heightCm: number | undefined;
  onHeightChange: (value: number | undefined) => void;
  stemDiameterMm: number | undefined;
  onStemDiameterChange: (value: number | undefined) => void;
  leafCount: number | undefined;
  onLeafCountChange: (value: number | undefined) => void;
  rootScore: number | undefined;
  onRootScoreChange: (value: number | undefined) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PropaguleUpdateFields({
  label,
  onLabelChange,
  healthScore,
  onHealthScoreChange,
  heightCm,
  onHeightChange,
  stemDiameterMm,
  onStemDiameterChange,
  leafCount,
  onLeafCountChange,
  rootScore,
  onRootScoreChange,
  notes,
  onNotesChange,
  isSubmitting,
  onSubmit,
  onCancel,
}: PropaguleUpdateFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Label / Custom Name
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g., 'Best performer', 'For sale'"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Health Score */}
      <HealthScoreSelector value={healthScore} onChange={onHealthScoreChange} />

      {/* Measurements */}
      <div className="grid grid-cols-2 gap-4">
        <MeasurementField label="Height" value={heightCm} onChange={onHeightChange} unit="cm" max={500} step={0.5} />
        <MeasurementField label="Stem Diameter" value={stemDiameterMm} onChange={onStemDiameterChange} unit="mm" max={100} step={0.1} />
        <MeasurementField label="Leaf Count" value={leafCount} onChange={onLeafCountChange} unit="leaves" max={1000} />
        <MeasurementField label="Root Score" value={rootScore} onChange={onRootScoreChange} unit="/ 5" min={1} max={5} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Add any observations or notes..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Photo Upload Placeholder */}
      <div className="p-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
        <div className="text-slate-400 dark:text-slate-500">Photo upload coming soon</div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={onSubmit} disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
