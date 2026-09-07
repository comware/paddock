/**
 * Every propagation guide the index lists must exist, and every guide that exists must be
 * listed.
 *
 * Thirteen of the eighty-nine entries pointed at files that were not there. Seven were
 * guides that had moved folder at some point with the index never updated - lavender listed
 * under intermediate/ while the file sat in herbs/, camellia and citrus under intermediate/
 * while the files were in advanced/. Six named guides that had never been written. Opening
 * any of them in the library failed.
 *
 * Six more went the other way: complete guides on disk - sweet potato, cherry, olive, lemon
 * balm, daylily, iris - that the index never listed, so nothing in the app could reach them.
 *
 * Nothing caught it because nothing checked. The two sides are edited independently and a
 * broken path is invisible until someone clicks it.
 */

import { describe, expect, it } from 'vitest';
import type { PropagationGuideMetadata } from '../propagation-types';
import indexJson from '../../../../public/guides/propagation/index.json';

const markdownByPath = import.meta.glob('../../../../public/guides/propagation/**/*.md', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const index = indexJson as { guides: PropagationGuideMetadata[] };

/** index.json stores "ornamentals/gardenia.md"; the glob keys are relative paths. */
function pathFor(file: string): string | undefined {
  const suffix = `/public/guides/propagation/${file}`;
  return Object.keys(markdownByPath).find((k) => k.endsWith(suffix));
}

/** Prose that is not a species guide: templates, per-directory notes, methods, onboarding. */
function isSpeciesGuide(key: string): boolean {
  const rel = key.slice(key.indexOf('/public/guides/propagation/') + '/public/guides/propagation/'.length);
  if (rel.includes('CLAUDE.md') || rel.startsWith('_') || rel.includes('/_')) return false;
  return !rel.startsWith('methods/') && !rel.startsWith('getting-started/');
}

describe('propagation guide index', () => {
  it.each(index.guides.map((g) => [g.id, g.file] as const))(
    '%s points at a file that exists',
    (_id, file) => {
      expect(pathFor(file), `index lists ${file}, which is not on disk`).toBeDefined();
    }
  );

  it('lists every species guide on disk', () => {
    const indexed = index.guides.map((g) => `/public/guides/propagation/${g.file}`);
    const orphans = Object.keys(markdownByPath)
      .filter(isSpeciesGuide)
      .filter((key) => !indexed.some((i) => key.endsWith(i)));

    expect(orphans, 'guides on disk the index never lists').toEqual([]);
  });
});
