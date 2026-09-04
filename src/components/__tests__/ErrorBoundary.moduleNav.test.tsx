/**
 * The error page must not offer the module that just crashed.
 *
 * MODULE_NAV entries are excluded by matching a lowercased DISPLAY NAME against the
 * `module` prop:
 *
 *   MODULE_NAV.filter((m) => m.name.toLowerCase() !== module)
 *
 * So the exclusion depends on a display string agreeing with an identifier, and renaming
 * one silently decouples them. That happened during the grow -> microgreens rename:
 * MODULE_NAV was updated to 'Microgreens' while the module still passed module="grow", so
 * the error page began offering a link straight back to whatever had just broken.
 *
 * These assert on hrefs rather than on link text. Text would let a MODULE_NAV rename pass
 * unnoticed - looking for the absence of "Microgreens" succeeds trivially if the entry has
 * been renamed to something else. The path is the stable thing.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from '../ErrorBoundary';

function Explode(): never {
  throw new Error('boom');
}

type ModuleProp = 'microgreens' | 'propagation' | 'planner' | 'settings';

const MODULE_PATHS: Record<ModuleProp, string> = {
  microgreens: '/microgreens',
  propagation: '/propagation',
  planner: '/planner',
  settings: '/settings',
};

function crashedLinks(module: ModuleProp): string[] {
  render(
    <MemoryRouter>
      <ErrorBoundary module={module} showModuleNav>
        <Explode />
      </ErrorBoundary>
    </MemoryRouter>
  );
  return screen
    .queryAllByRole('link')
    .map((a) => a.getAttribute('href') ?? '')
    .filter((href) => Object.values(MODULE_PATHS).includes(href));
}

afterEach(() => vi.restoreAllMocks());

describe('the error page never suggests the module that just failed', () => {
  it.each(Object.keys(MODULE_PATHS) as ModuleProp[])('excludes %s', (module) => {
    // React logs the caught error; silence it so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const links = crashedLinks(module);

    expect(links).not.toContain(MODULE_PATHS[module]);
    // Every other module is still offered - so the assertion above is not passing
    // merely because the navigation failed to render at all.
    for (const [other, path] of Object.entries(MODULE_PATHS)) {
      if (other !== module) expect(links).toContain(path);
    }
  });
});
