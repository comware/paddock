/**
 * NotFound - the record you asked for is not there.
 *
 * Seven detail pages wrote this out individually - batch, propagule, station, mother plant,
 * supply, planting, growing space - each with the same three sentences and a button back to
 * the list. Six of the seven rendered a bare `?` where an icon should have been, because
 * they were copies of each other and the original had lost its glyph.
 *
 * The copy differs only in the noun, so that is the only thing this takes. Headings are
 * sentence case, matching the empty states elsewhere ("No beds yet") rather than the Title
 * Case half of these had drifted into.
 */

import { SearchX } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NotFoundProps {
  /** What was not found, capitalised as it starts the heading - "Batch", "Growing space". */
  thing: string;
  /** Where to go instead. The label names the list, e.g. "Back to batches". */
  backTo: { label: string; onClick: () => void };
}

export function NotFound({ thing, backTo }: NotFoundProps) {
  return (
    <EmptyState
      Icon={SearchX}
      title={`${thing} not found`}
      description={`This ${thing.toLowerCase()} doesn't exist or may have been deleted.`}
      action={backTo}
    />
  );
}
