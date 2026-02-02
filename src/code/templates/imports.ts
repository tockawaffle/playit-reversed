/**
 * Template imports for code generation
 * 
 * IMPORTANT: This file is used as a template. The imports here are validated
 * by TypeScript to ensure they exist. The contents will be read and included
 * in the generated playit.ts file.
 */

// These imports are used in the generated file
// They are validated here to catch any package/path issues at compile time

import { spawn } from "child_process";

// Re-export to ensure TypeScript validates these imports exist
export { spawn };

// Type imports from the generated types file
// Note: In the actual generated file, these come from "./types"
export type {
	AgentData,
	AgentRef,
	AgentRefById,
	AllocatedTunnelAlloc,
	AllocationData,
	CreateStaticIpTunnelOptions,
	DisabledTunnelAlloc,
	PendingTunnelAlloc,
	PlayitResponse,
	TunnelAlloc,
	TunnelData,
	TunnelRef,
	TunnelRefById,
	UpdateTunnelOptions
} from "./types";

