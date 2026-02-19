import "dotenv/config";

// Main client (internal, used by CLI)
export { PlayIt as default, PlayIt } from "./client";

// Types - re-exported from schema definitions
export type * from "./code/main/bfetch/schemas/allocations-list";
export type * from "./types";
export type { CreateTunnelOptions, UpdateTunnelOptions, TunnelRef, TunnelRefById, AgentRef, AgentRefById, PlayitResponse, TunnelData, AgentData, AllocationData } from "./code/templates/types";

// Codegen guard
export { CodegenRequiredError, isCodegenComplete, requireCodegen } from "./guard";

// Action implementations - used by generated code
export * from "./code/actions";

// Re-export action result type
export * from "./code/actions";
export * from "./code/main/bfetch/schemas/allocations-list";
export * from "./code/main/regions";

