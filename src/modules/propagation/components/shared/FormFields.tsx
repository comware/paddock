/**
 * FormFields - Shared form field components for the propagation module.
 *
 * Extracts common patterns duplicated across NewBatchForm, StationForm,
 * SupplyForm, and GraduationForm. Uses react-hook-form register patterns.
 *
 * Each component handles its own label, input, and error display,
 * reducing per-field boilerplate from ~10 lines to 1 line.
 */

import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

// ============================================
// SHARED STYLES
// ============================================

const INPUT_CLASSES =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent';

const LABEL_CLASSES =
  'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

const ERROR_CLASSES = 'mt-1 text-sm text-red-500';

// ============================================
// FORM SECTION HEADER
// ============================================

interface FormSectionHeaderProps {
  title: string;
}

/**
 * Section header used within forms (e.g., "Plant Information", "Quantity & Location").
 */
export function FormSectionHeader({ title }: FormSectionHeaderProps) {
  return (
    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
      {title}
    </h3>
  );
}

// ============================================
// REQUIRED TEXT FIELD
// ============================================

interface RequiredTextFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Standard text input with label, required indicator, and error display.
 *
 * Usage:
 * ```tsx
 * <RequiredTextField
 *   label="Name"
 *   registration={register('name')}
 *   error={errors.name}
 *   placeholder="Enter name..."
 * />
 * ```
 */
export function RequiredTextField({
  label,
  registration,
  error,
  placeholder,
  disabled,
}: RequiredTextFieldProps) {
  return (
    <div>
      <label className={LABEL_CLASSES}>
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        {...registration}
        placeholder={placeholder}
        disabled={disabled}
        className={INPUT_CLASSES}
      />
      {error && <p className={ERROR_CLASSES}>{error.message}</p>}
    </div>
  );
}

// ============================================
// OPTIONAL TEXT FIELD
// ============================================

interface OptionalTextFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Standard text input with label, "(optional)" indicator, and error display.
 */
export function OptionalTextField({
  label,
  registration,
  error,
  placeholder,
  disabled,
}: OptionalTextFieldProps) {
  return (
    <div>
      <label className={LABEL_CLASSES}>
        {label} <span className="text-slate-400 font-normal">(optional)</span>
      </label>
      <input
        type="text"
        {...registration}
        placeholder={placeholder}
        disabled={disabled}
        className={INPUT_CLASSES}
      />
      {error && <p className={ERROR_CLASSES}>{error.message}</p>}
    </div>
  );
}

// ============================================
// NUMERIC RANGE FIELD
// ============================================

interface NumericRangeFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}

/**
 * Number input with min/max bounds, label, and error display.
 *
 * Usage:
 * ```tsx
 * <NumericRangeField
 *   label="Quantity"
 *   registration={register('quantity', { valueAsNumber: true })}
 *   error={errors.quantity}
 *   min={1}
 *   max={1000}
 * />
 * ```
 */
export function NumericRangeField({
  label,
  registration,
  error,
  min,
  max,
  step,
  placeholder,
  disabled,
  hint,
}: NumericRangeFieldProps) {
  return (
    <div>
      <label className={LABEL_CLASSES}>{label}</label>
      <input
        type="number"
        {...registration}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className={INPUT_CLASSES}
      />
      {hint && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      {error && <p className={ERROR_CLASSES}>{error.message}</p>}
    </div>
  );
}

// ============================================
// SELECT FIELD
// ============================================

interface SelectFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Standard select input with label, options, and error display.
 *
 * Usage:
 * ```tsx
 * <SelectField
 *   label="Unit"
 *   registration={register('unit')}
 *   error={errors.unit}
 *   options={[{ value: 'ml', label: 'Milliliters' }]}
 *   required
 * />
 * ```
 */
export function SelectField({
  label,
  registration,
  error,
  options,
  placeholder,
  disabled,
  required,
}: SelectFieldProps) {
  return (
    <div>
      <label className={LABEL_CLASSES}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && (
          <span className="text-slate-400 font-normal ml-1">(optional)</span>
        )}
      </label>
      <select
        {...registration}
        disabled={disabled}
        className={INPUT_CLASSES}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className={ERROR_CLASSES}>{error.message}</p>}
    </div>
  );
}

// ============================================
// TEXTAREA FIELD
// ============================================

interface TextareaFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

/**
 * Standard textarea with label and error display.
 */
export function TextareaField({
  label,
  registration,
  error,
  placeholder,
  rows = 2,
  required,
}: TextareaFieldProps) {
  return (
    <div>
      <label className={LABEL_CLASSES}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && (
          <span className="text-slate-400 font-normal ml-1">(optional)</span>
        )}
      </label>
      <textarea
        {...registration}
        rows={rows}
        placeholder={placeholder}
        className={`${INPUT_CLASSES} resize-none`}
      />
      {error && <p className={ERROR_CLASSES}>{error.message}</p>}
    </div>
  );
}

// ============================================
// FORM ERROR DISPLAY
// ============================================

interface FormErrorProps {
  message: string | null;
}

/**
 * Standardized form-level error display banner.
 */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}

// ============================================
// FORM ACTIONS
// ============================================

interface FormActionsProps {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

/**
 * Standard form action buttons (Cancel + Submit).
 */
export function FormActions({
  onCancel,
  isSubmitting,
  submitLabel = 'Save',
  submittingLabel = 'Saving...',
}: FormActionsProps) {
  return (
    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
