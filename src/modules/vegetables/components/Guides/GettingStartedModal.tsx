/**
 * GettingStartedModal - Full-screen modal for a vegetable getting-started guide.
 *
 * A sibling of GuideDetailModal rather than a branch inside it. GuideDetailModal is built on
 * useVegetableGuide, which resolves a *crop name* through an alias table and a five-step
 * fuzzy matcher before it can find a file. A getting-started guide has no crop name and no
 * index entry - it is a known path - so routing it through that hook would mean threading a
 * "skip the lookup" flag through a matcher whose whole job is looking things up.
 *
 * Propagation shares one modal between its species guides and its getting-started pages, but
 * it can afford to: its guides carry the file path on the metadata object, so both cases are
 * already "fetch this path". Vegetables' are not, and forcing the shared shape here would
 * cost more than the duplicated fetch it saves.
 */

import { useEffect, useState } from 'react';
import { LoadingState, GuideMarkdown } from '@/components/shared';
import { Modal } from '@/components/ui';

export interface GettingStartedGuide {
  id: string;
  title: string;
  description: string;
  file: string;
}

interface GettingStartedModalProps {
  guide: GettingStartedGuide | null;
  onClose: () => void;
}

// Fetched markdown, kept for the life of the tab. These files do not change between
// openings, and re-fetching one every time a reader flicks back to it is needless.
const contentCache = new Map<string, string>();

export function GettingStartedModal({ guide, onClose }: GettingStartedModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const file = guide?.file ?? null;

  useEffect(() => {
    if (!file) {
      setContent(null);
      setError(null);
      return;
    }

    const cached = contentCache.get(file);
    if (cached) {
      setContent(cached);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/guides/vegetables/${file}`);
        if (!res.ok) throw new Error(`Failed to load guide: ${file}`);
        const text = await res.text();
        contentCache.set(file, text);
        if (!isCancelled) setContent(text);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load guide');
          setContent(null);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  if (!guide) return null;

  return (
    <Modal isOpen onClose={onClose} title={guide.title} size="3xl">
      <div className="p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{guide.description}</p>
        <div className="overflow-y-auto">
          {isLoading ? (
            <LoadingState className="py-12" />
          ) : error ? (
            <p className="text-center text-slate-500 py-8">Failed to load guide: {error}</p>
          ) : content ? (
            <GuideMarkdown content={content} />
          ) : (
            <p className="text-center text-slate-500 py-8">Failed to load guide content</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
