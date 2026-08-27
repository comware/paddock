/**
 * WebMCP integration - exposes Paddock's local data to browser AI agents.
 *
 * See webmcp-challenge/docs/TOOL-DESIGN.md for the rationale behind the tool shapes.
 */

export { registerPaddockTools, PADDOCK_TOOL_NAMES } from './register';
export { buildGrowingContext, aggregateHistory } from './context';
export { isWebMCPAvailable } from './types';
export type { GrowingContext, VarietyHistory } from './context';
export type { ToolDefinition, RegisteredTool, ModelContext } from './types';
