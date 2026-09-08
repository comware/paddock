/**
 * The guides must stay in the precache manifest.
 *
 * They were left out of it for the entire life of the app: `globPatterns` listed
 * js/css/html/ico/png/svg/woff2 and nothing else, and no runtimeCaching rule covered
 * /guides/. Every guide was therefore a live network fetch, so opening the library with no
 * signal gave an error and every crop guide came up blank - in an app whose manifest
 * describes it as local-first and whose users are usually standing in a paddock.
 *
 * Nothing failed while that was true. The build was green, the tests were green, and the app
 * worked perfectly on a desk with wifi. It is exactly the kind of regression that comes back
 * the next time someone tightens the glob to trim install size, so it is asserted here
 * rather than left to be rediscovered in a greenhouse.
 *
 * This reads the config as text rather than importing it and inspecting the plugin. The
 * workbox options are not resolved until vite-plugin-pwa's `configResolved` has run, so an
 * imported config exposes nothing to assert against - and the failure being guarded is an
 * edit to two specific lines, which is precisely what text can see. `?raw` via import.meta
 * .glob, rather than node:fs, for the same reason the guide index test uses it: it keeps
 * @types/node out of the app's tsconfig.
 */

import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('../../vite.config.ts', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const config = Object.values(sources)[0];

/** The contents of a named array literal in the workbox block, as one string. */
function arrayLiteral(name: string): string {
  const match = new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`).exec(config);
  expect(match, `no ${name} in vite.config.ts`).not.toBeNull();
  return match![1];
}

describe('service worker precache', () => {
  it('reads the config', () => {
    // Guards the glob above: a rename would otherwise make every assertion below vacuous.
    expect(config, 'vite.config.ts was not loaded').toContain('VitePWA');
  });

  it('precaches guide markdown and the index files that make it reachable', () => {
    const patterns = arrayLiteral('globPatterns');

    // Markdown is the guides themselves.
    expect(patterns, 'guide markdown is not precached - the library breaks offline').toMatch(
      /\bmd\b/
    );
    // Each library renders from an index.json. Without it the guides are on the device and
    // unreachable, which to a reader looks identical to them being absent.
    expect(patterns, 'guide indexes are not precached - the library cannot render offline').toMatch(
      /\bjson\b/
    );
  });

  it('keeps author-facing prose out of the precache', () => {
    const ignores = arrayLiteral('globIgnores');

    // public/ is copied wholesale, so the per-directory authoring notes and the templates
    // they work from sit alongside the guides. Precaching them would put instructions
    // written for an agent onto every user's device.
    expect(ignores).toContain('CLAUDE.md');
    expect(ignores).toContain('_template');
  });
});
