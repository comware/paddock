/**
 * Component class names must actually be defined.
 *
 * Nine call sites across eight files wrote `className="btn btn-primary"` against a
 * convention that was never implemented - no rule for it existed anywhere in the CSS. The
 * buttons still rendered as <button> elements, so every component test kept passing while
 * the primary action on an empty module looked like a paragraph.
 *
 * A test that renders a component cannot catch this: jsdom does not apply the stylesheet,
 * so an undefined class and a defined one look identical from the DOM. The only place the
 * absence is visible is the stylesheet itself, so that is what this reads.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read off disk rather than imported.
 *
 * `import css from '../../index.css?raw'` comes back as an empty string here: Vitest stubs
 * CSS imports by default, and the Tailwind Vite plugin claims `.css` files before the
 * `?raw` query is honoured. Either way every assertion below would fail for the wrong
 * reason. The file on disk is the thing being asserted about, so read that.
 */
const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8');

/** Class names used as component classes in TSX, which therefore need a rule in index.css. */
const COMPONENT_CLASSES = ['btn', 'btn-primary', 'card'];

describe('component classes in index.css', () => {
  it.each(COMPONENT_CLASSES)('defines .%s', (name) => {
    // Matches `.name {` and `.name:hover {`, but not `.name-suffix {`.
    expect(css).toMatch(new RegExp(`\\.${name}(?![\\w-])[^{]*\\{`));
  });
});
