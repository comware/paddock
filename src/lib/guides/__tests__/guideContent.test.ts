/**
 * The guide modals show the guide's name in their own header, then render the markdown
 * underneath - and every guide file opens with that same name as an H1. So a grower opening
 * cabbage saw "Cabbage" twice, once above the other.
 *
 * It is also a heading-order problem, not only a visual repeat: the modal's title is an
 * <h2>, so the markdown's <h1> arrives after it. A screen reader user gets a level-one
 * heading nested inside a level-two one, which reads as the start of a new document.
 */

import { describe, expect, it } from 'vitest';
import { stripLeadingHeading } from '../guideContent';

describe('stripLeadingHeading', () => {
  it('removes the title the modal is already showing', () => {
    expect(stripLeadingHeading('# Cabbage\n\n## Quick Facts\n')).toBe('## Quick Facts\n');
  });

  it('leaves the rest of the document alone', () => {
    const body = '## Quick Facts\n\n| a | b |\n\n# Not really a heading in a table\n';
    expect(stripLeadingHeading(`# Cabbage\n\n${body}`)).toBe(body);
  });

  it('only removes a heading that opens the document', () => {
    const md = '## Quick Facts\n\n# Later Heading\n';
    expect(stripLeadingHeading(md)).toBe(md);
  });

  it('leaves a document that never had one', () => {
    expect(stripLeadingHeading('Just prose.\n')).toBe('Just prose.\n');
  });

  it('does not mistake a level-two heading for the title', () => {
    expect(stripLeadingHeading('## Quick Facts\n')).toBe('## Quick Facts\n');
  });

  it('copes with leading blank lines', () => {
    expect(stripLeadingHeading('\n\n# Cabbage\n\n## Quick Facts\n')).toBe('## Quick Facts\n');
  });

  it('returns empty content unchanged rather than throwing', () => {
    expect(stripLeadingHeading('')).toBe('');
  });
});
