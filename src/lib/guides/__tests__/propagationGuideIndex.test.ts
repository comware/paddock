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

/**
 * The headline figures in index.json must be the ones the guide itself states.
 *
 * 134 of 304 facts disagreed. Some was vocabulary - the index said "easy" where the guide
 * said "Beginner" - but plenty was substantive: willow at 3-6 weeks in the index and 2-4 in
 * the guide, grape at 6-10 weeks against 3-6 months, citrus recommending semi-hardwood
 * cuttings in the index and grafting in the guide. The index was also systematically more
 * optimistic about difficulty than the guides it summarises; realigning moved twelve crops
 * out of "easy".
 *
 * Containment rather than equality, because the two are not the same kind of statement. The
 * guide may give a figure per method - "4-8 weeks (softwood), 3-6 months (hardwood)" - while
 * the index carries only the one for the method it recommends. So the index value must
 * appear in the guide's, not equal it.
 */
const FACTS = [
  ['difficulty', 'Difficulty'],
  ['bestMethod', 'Best Method'],
  ['timeToRoot', 'Time to Root'],
  ['successRate', 'Success Rate'],
] as const;

function quickFact(markdown: string, label: string): string | null {
  const row = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|([^|]*)\\|`).exec(markdown);
  // "80-95% typical" and "80-95%" are the same claim.
  return row ? row[1].trim().replace(' typical', '').trim() : null;
}

describe('propagation guide index', () => {
  it.each(index.guides.map((g) => [g.id, g.file] as const))(
    '%s points at a file that exists',
    (_id, file) => {
      expect(pathFor(file), `index lists ${file}, which is not on disk`).toBeDefined();
    }
  );

  it.each(index.guides.map((g) => [g.id, g] as const))(
    '%s states the same facts as its guide',
    (_id, guide) => {
      const key = pathFor(guide.file);
      expect(key, `${guide.file} is not on disk`).toBeDefined();
      const markdown = markdownByPath[key!];

      for (const [field, label] of FACTS) {
        const stated = quickFact(markdown, label);
        expect(stated, `${guide.file}: no "${label}" row`).not.toBeNull();
        expect(
          stated!.toLowerCase(),
          `${guide.file}: index says ${label} is "${guide[field]}"`
        ).toContain(String(guide[field]).toLowerCase());
      }
    }
  );

  /**
   * Guides link to each other at the bottom. Two of the guides written today pointed at
   * species this library does not have - fruit/grape and succulents/snake-plant - and
   * neither of the checks above noticed, because they only look at the index. A dead
   * cross-link is the same failure as a dead index entry, one layer down.
   */
  it.each(index.guides.map((g) => [g.id, g] as const))(
    '%s only links to guides that exist',
    (_id, guide) => {
      const markdown = markdownByPath[pathFor(guide.file)!];
      const links = [...markdown.matchAll(/\(\/guides\/propagation\/([^)]+)\)/g)].map((m) => m[1]);
      const dead = links.filter((l) => !pathFor(`${l}.md`));

      expect(dead, `${guide.file} links to guides that are not there`).toEqual([]);
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
