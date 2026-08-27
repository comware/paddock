/**
 * Minimal WebMCP type surface.
 *
 * The API is an origin trial and ships no bundled types, so we declare only what we
 * actually call. Kept deliberately small - anything broader would be guessing at a spec
 * that is still moving.
 *
 * Spec: https://github.com/webmachinelearning/webmcp
 */

export interface ToolDefinition<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: TInput) => unknown | Promise<unknown>;
}

export interface RegisteredTool {
  name: string;
  description: string;
  /** Serialised JSON Schema - the runtime returns this as a string, not an object. */
  inputSchema?: string;
  origin?: string;
  pageUrl?: string;
}

export interface ModelContext {
  registerTool: (tool: ToolDefinition<never>) => Promise<void>;
  getTools: (options?: { fromOrigins?: string[] }) => Promise<RegisteredTool[]>;
  executeTool?: (tool: RegisteredTool, args: unknown) => Promise<unknown>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

/** True when the current runtime exposes WebMCP. */
export function isWebMCPAvailable(): boolean {
  return typeof document !== 'undefined' && typeof document.modelContext?.registerTool === 'function';
}
