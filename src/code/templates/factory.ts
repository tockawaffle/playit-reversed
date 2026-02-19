/**
 * Template factory functions for code generation
 * 
 * IMPORTANT: This file is used as a template. The code here is validated
 * by TypeScript. The contents will be read and included in the generated
 * playit.ts file.
 */

import type {
	AgentData,
	AgentRef,
	AgentRefById,
	CreateTunnelOptions,
	TunnelData,
	TunnelRef,
	TunnelRefById,
	UpdateTunnelOptions
} from "./types";

// Placeholder types - these are replaced with actual union types during generation
type AgentId = string;
type TunnelId = string;

// Forward declarations - these functions are defined in actions.ts
declare function deleteTunnel(tunnelId: TunnelId,): Promise<void>;
declare function updateTunnel(tunnelId: TunnelId, options: UpdateTunnelOptions,): Promise<void>;
declare function enableTunnel(tunnelId: TunnelId,): Promise<void>;
declare function disableTunnel(tunnelId: TunnelId,): Promise<void>;
declare function deleteAgent(agentId: AgentId,): Promise<void>;
declare function renameAgent(agentId: AgentId, newName: string,): Promise<void>;
declare function createTunnel(options: CreateTunnelOptions & { agentId: string }, waitForAllocation: boolean): Promise<TunnelData>;

// ============ Factory Functions ============

function createTunnelRef(data: TunnelData,): TunnelRef {
	return {
		...data,
		delete: () => deleteTunnel(data.id),
		update: (options) => updateTunnel(data.id, options),
		enable: () => enableTunnel(data.id),
		disable: () => disableTunnel(data.id),
	};
}

/** Create a minimal tunnel ref by ID only (for tunnels not in codegen, e.g. newly created) */
function createTunnelRefById(id: TunnelId,): TunnelRefById {
	return {
		id,
		delete: () => deleteTunnel(id),
		update: (options) => updateTunnel(id, options),
		enable: () => enableTunnel(id),
		disable: () => disableTunnel(id),
	};
}

function createAgentRef(data: AgentData, tunnelRefs: TunnelRef[],): AgentRef {
	return {
		...data,
		tunnels: tunnelRefs,
		createTunnel: async (options) => createTunnelRef(await createTunnel({ ...options, agentId: data.id }, true) as TunnelData),
		delete: () => deleteAgent(data.id),
		rename: (newName) => renameAgent(data.id, newName),
	};
}

/** Create a minimal agent ref by ID only (for agents not in codegen, e.g. newly created) */
function createAgentRefById(id: AgentId,): AgentRefById {
	return {
		id,
		createTunnel: async (options) => createTunnelRef(await createTunnel({ ...options, agentId: id }, true) as TunnelData),
		delete: () => deleteAgent(id),
		rename: (newName) => renameAgent(id, newName),
	};
}

// Export for validation
export { createAgentRef, createAgentRefById, createTunnelRef, createTunnelRefById };

