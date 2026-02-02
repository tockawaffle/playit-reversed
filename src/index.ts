import "dotenv/config";

// Main client (internal, used by CLI)
export { PlayIt as default, PlayIt } from "./client";

// Types - re-exported from schema definitions
export type * from "./code/main/bfetch/schemas/settings-allocations";

// Codegen guard
export { CodegenRequiredError, isCodegenComplete, requireCodegen } from "./guard";

// Action implementations - used by generated code
export {
	createStaticIpTunnel, deleteAgent, deleteTunnel, disableTunnel, enableTunnel, renameAgent, updateTunnel
} from "./code/actions";

// Re-export action result type
export type { AllocationResult } from "./code/actions";
export { regionKeys } from "./code/main/regions";

