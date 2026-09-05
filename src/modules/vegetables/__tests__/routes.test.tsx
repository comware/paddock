/**
 * Route smoke test for the vegetables module.
 *
 * A full app-router render (mounting AppShell -> lazy VegetablesModule -> its own
 * IndexedDB-backed stores) pulls in the whole platform's dependency graph — settings
 * store, module-enablement store, Dexie — for a check that is really about routing
 * shape. Asserting on the route table itself is the direct, dependency-free way to
 * confirm the module is reachable: the index route resolves to the dashboard, and the
 * dynamic planting-detail path exists so /vegetables/plantings/:id is routable rather
 * than a 404.
 */

import { describe, it, expect } from 'vitest';
import { vegetablesRoutes } from '../routes';

describe('vegetablesRoutes', () => {
  it('has an index route for the dashboard', () => {
    const indexRoute = vegetablesRoutes.find((r) => r.index);
    expect(indexRoute).toBeDefined();
    expect(indexRoute?.element).toBeTruthy();
  });

  it('has a plantings/:id route for planting detail', () => {
    const detailRoute = vegetablesRoutes.find((r) => r.path === 'plantings/:id');
    expect(detailRoute).toBeDefined();
    expect(detailRoute?.element).toBeTruthy();
  });

  it('has beds and plantings list routes', () => {
    const paths = vegetablesRoutes.map((r) => r.path);
    expect(paths).toContain('beds');
    expect(paths).toContain('plantings');
  });
});
