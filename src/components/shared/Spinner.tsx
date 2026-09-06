/**
 * Spinner and LoadingState - one waiting indicator instead of four.
 *
 * The app drew a spinner three different ways: a ring with only its bottom border coloured
 * (`border-b-2 border-primary-500`, eight places), a ring with a transparent top
 * (`border-4 border-t-transparent`, the three guide modals), and a pulsing seedling emoji
 * with the text "Loading..." in ModuleLoader. They spin at different weights and read as
 * three different states of the same app.
 *
 * The kept shape is the transparent-top ring: at border-4 it stays legible at small sizes,
 * where the single-bottom-border version thins out to almost nothing.
 *
 * `aria-busy` and the visually-hidden label are here rather than at each call site, because
 * a bare spinning div announces nothing at all - a screen reader user was told the region
 * was empty rather than that it was loading.
 */

interface LoadingStateProps {
  /** What is being waited on. Read by screen readers; not shown. */
  label?: string;
  /** Vertical breathing room. Panels use "py-8"; full pages use more. */
  className?: string;
}

export function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`${className} border-4 border-primary-500 border-t-transparent rounded-full animate-spin`}
    />
  );
}

export function LoadingState({ label = 'Loading', className = 'p-8' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={`flex items-center justify-center ${className}`}
    >
      <Spinner />
      <span className="sr-only">{label}</span>
    </div>
  );
}
