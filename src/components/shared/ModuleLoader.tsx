/**
 * ModuleLoader - Loading fallback for lazy-loaded modules.
 *
 * Was a pulsing seedling emoji over the text "Loading...", which made the one wait a grower
 * sees most often - switching between modules - look unrelated to every other wait in the
 * app. It uses the same spinner now.
 */

import { LoadingState } from './Spinner';

export function ModuleLoader() {
  return <LoadingState label="Loading module" className="flex-1 p-12" />;
}
