/**
 * WebMCP Tool Registration
 *
 * Exposes Paddock's growing data and planning capability to an AI agent running in the
 * browser, without any of it leaving the device.
 *
 * Two constraints from measured runtime behaviour shape this file
 * (see webmcp-challenge/docs/FINDINGS.md):
 *
 *   F2 - `document.modelContext` is not an EventTarget in ChatGPT's implementation, so
 *        the spec's `toolchange` event never fires. Tools registered after the agent's
 *        initial discovery pass may never be seen. Therefore: register the complete set
 *        once, at startup. Tools that have nothing to say return an explicit empty
 *        result rather than being registered conditionally.
 *
 *   F4 - Each tool call costs ~25s of agent deliberation regardless of how trivial the
 *        tool is. Therefore: few tools, each doing one complete unit of user-meaningful
 *        work.
 */

import { buildGrowingContext } from './context';
import { isWebMCPAvailable, type ToolDefinition } from './types';

let registered = false;

/**
 * Register Paddock's tools. Safe to call more than once - subsequent calls are ignored,
 * which matters under React StrictMode's double-invoked effects.
 *
 * Never throws: a runtime without WebMCP is the normal case, not an error.
 */
export async function registerPaddockTools(): Promise<{
  registered: boolean;
  reason?: string;
}> {
  if (registered) {
    return { registered: true, reason: 'already registered' };
  }

  if (!isWebMCPAvailable()) {
    return { registered: false, reason: 'WebMCP not available in this runtime' };
  }

  const modelContext = document.modelContext!;

  try {
    for (const tool of TOOLS) {
      await modelContext.registerTool(tool as ToolDefinition<never>);
    }
    registered = true;
    return { registered: true };
  } catch (error) {
    // A failed registration must never prevent Paddock from running. The app is fully
    // usable by a human without any of this.
    return { registered: false, reason: (error as Error).message };
  }
}

// ============================================
// T1 - get-growing-context
// ============================================

const getGrowingContext: ToolDefinition = {
  name: 'get-growing-context',
  description:
    "Returns the grower's complete current context: their site, configured varieties, " +
    'trays currently growing, per-variety performance history from their own past trays ' +
    '(actual germination rates, harvest weights, and observed days-to-harvest), planned ' +
    'plantings, and tray capacity. Call this first before proposing any planting plan. ' +
    'The history reflects what actually happened on this particular grower\'s bench, ' +
    'which often differs from seed packet timings - prefer it when it is available.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async execute() {
    return await buildGrowingContext();
  },
};

// ============================================
// Registry
// ============================================

const TOOLS: ToolDefinition[] = [getGrowingContext];

/** Exported for tests and for the dev-only inspector panel. */
export const PADDOCK_TOOL_NAMES = TOOLS.map((t) => t.name);
