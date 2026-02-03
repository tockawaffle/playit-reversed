/**
 * Template factory functions for code generation
 * 
 * IMPORTANT: This file is used as a template. The code here is validated
 * by TypeScript. The contents will be read and included in the generated
 * playit.ts file.
 */

import type { AllocationResult } from "../actions";
import type {
	AgentData,
	AgentRef,
	AgentRefById,
	CreateRegionTunnelOptions,
	CreateStaticIpTunnelOptions,
	TunnelData,
	TunnelRef,
	TunnelRefById,
	UpdateTunnelOptions
} from "./types";

// Placeholder types - these are replaced with actual union types during generation
type AgentId = string;
type TunnelId = string;

// Forward declarations - these functions are defined in actions.ts
declare function deleteTunnel(tunnelId: TunnelId, csrfToken: string): Promise<void>;
declare function updateTunnel(tunnelId: TunnelId, options: UpdateTunnelOptions, csrfToken: string): Promise<void>;
declare function enableTunnel(tunnelId: TunnelId, csrfToken: string): Promise<void>;
declare function disableTunnel(tunnelId: TunnelId, csrfToken: string): Promise<void>;
declare function deleteAgent(agentId: AgentId, csrfToken: string): Promise<void>;
declare function renameAgent(agentId: AgentId, newName: string, csrfToken: string): Promise<void>;
declare function createStaticIpTunnel(agentId: AgentId, options: CreateStaticIpTunnelOptions, waitForAllocation: boolean, waitForAllocatedStatus: boolean): Promise<AllocationResult>;
declare function createRegionTunnel(agentId: AgentId, options: CreateRegionTunnelOptions, waitForAllocation: boolean, waitForAllocatedStatus: boolean): Promise<AllocationResult>;

// ============ Factory Functions ============

function createTunnelRef(data: TunnelData, csrfToken: string): TunnelRef {
	return {
		...data,
		delete: () => deleteTunnel(data.id, csrfToken),
		update: (options) => updateTunnel(data.id, options, csrfToken),
		enable: () => enableTunnel(data.id, csrfToken),
		disable: () => disableTunnel(data.id, csrfToken),
	};
}

/** Create a minimal tunnel ref by ID only (for tunnels not in codegen, e.g. newly created) */
function createTunnelRefById(id: TunnelId, csrfToken: string): TunnelRefById {
	return {
		id,
		delete: () => deleteTunnel(id, csrfToken),
		update: (options) => updateTunnel(id, options, csrfToken),
		enable: () => enableTunnel(id, csrfToken),
		disable: () => disableTunnel(id, csrfToken),
	};
}

function createAgentRef(data: Omit<AgentData, "tunnels">, tunnelRefs: TunnelRef[], csrfToken: string): AgentRef {
	return {
		...data,
		tunnels: tunnelRefs,
		createStaticIpTunnel: (options, waitForAllocation, waitForAllocatedStatus) => createStaticIpTunnel(data.id, options, waitForAllocation, waitForAllocatedStatus),
		createRegionTunnel: (options, waitForAllocation, waitForAllocatedStatus) => createRegionTunnel(data.id, options, waitForAllocation, waitForAllocatedStatus),
		delete: () => deleteAgent(data.id, csrfToken),
		rename: (newName) => renameAgent(data.id, newName, csrfToken),
	};
}

/** Create a minimal agent ref by ID only (for agents not in codegen, e.g. newly created) */
function createAgentRefById(id: AgentId, csrfToken: string): AgentRefById {
	return {
		id,
		createStaticIpTunnel: (options, waitForAllocation, waitForAllocatedStatus) => createStaticIpTunnel(id, options, waitForAllocation, waitForAllocatedStatus),
		createRegionTunnel: (options, waitForAllocation, waitForAllocatedStatus) => createRegionTunnel(id, options, waitForAllocation, waitForAllocatedStatus),
		delete: () => deleteAgent(id, csrfToken),
		rename: (newName) => renameAgent(id, newName, csrfToken),
	};
}

// Export for validation
export { createAgentRef, createAgentRefById, createTunnelRef, createTunnelRefById };

