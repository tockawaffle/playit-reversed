/**
 * Template types for code generation
 * 
 * These types are derived from the bfetch schema and transformed to camelCase
 * for user-friendly access in the generated code.
 * 
 * IMPORTANT: This file is used as a template. The contents will be read and
 * included in the generated types.ts file.
 */

// Import actual types from schema for validation
import type z from "zod";
import type { agentsListOutputSchema } from "../main/bfetch/schemas/agents-list";
import type { tunnelsCreateInputSchema } from "../main/bfetch/schemas/tunnels-create";
import type { tunnelsListOutputSchema } from "../main/bfetch/schemas/tunnels-list";
import type { allocationsListOutputSchema } from "../main/bfetch/schemas/allocations-list";
import type { GameTunnelType } from "../main/tunnel-types";

// ============ Codegen Placeholder Types ============
// These are replaced with actual union types during generation

/** Placeholder - replaced with actual agent IDs during generation */
export type AgentId = string;

/** Placeholder - replaced with actual agent names during generation */
export type AgentName = string;

/** Placeholder - replaced with actual agent keys during generation */
export type AgentKey = string;

/** Placeholder - replaced with actual tunnel IDs during generation */
export type TunnelId = string;

/** Placeholder - replaced with actual tunnel names during genefration */
export type TunnelName = string;

/** Placeholder - replaced with actual tunnel keys during generation */
export type TunnelKey = string;

/** Placeholder - replaced with actual allocation keys during generation */
export type AllocationKey = string;

// ============ API Response Types ============

/** PlayIt API response wrapper */
export interface PlayitResponse<T> {
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
}

// ============ Tunnel Types ============

/** Tunnel creation options — discriminated by tunnel_type */
export type CreateTunnelOptions = {
	name: string;
	config: z.infer<typeof tunnelsCreateInputSchema.shape.origin.shape.data.shape.config>;
	endpoint: z.infer<typeof tunnelsCreateInputSchema.shape.endpoint>;
} & (
		| {
			protocol: {
				type: "raw-ports";
				details: {
					port_type: "tcp" | "udp" | "both";
					port_count: number;
					software_description: string;
				};
			}
			| {
				type: "tunnel-type";
				details: GameTunnelType;
			}
		}
	)

/** Tunnel update options */
export interface UpdateTunnelOptions {
	name?: string;
	localPort?: number;
	localIp?: string;
}

/** Single tunnel data from the API response */
export type TunnelData = z.infer<typeof tunnelsListOutputSchema.shape.data.shape.tunnels>[number];

/** Single agent data from the API response */
export type AgentData = z.infer<typeof agentsListOutputSchema>["data"]["agents"][number];

/** Single allocation data from the API response */
export type AllocationData = z.infer<typeof allocationsListOutputSchema>["data"]["ips"][number];

/** Tunnel with actions */
export interface TunnelRef extends TunnelData {
	/** Delete this tunnel */
	delete(): Promise<void>;
	/** Update this tunnel */
	update(options: UpdateTunnelOptions): Promise<void>;
	/** Enable this tunnel */
	enable(): Promise<void>;
	/** Disable this tunnel */
	disable(): Promise<void>;
}

/**
 * Minimal tunnel ref for operations by ID only.
 * Use when the tunnel is not in codegen (e.g. newly created or from another source).
 */
export interface TunnelRefById {
	readonly id: z.infer<typeof tunnelsListOutputSchema.shape.data.shape.tunnels>[number]["id"];
	delete(): Promise<void>;
	update(options: UpdateTunnelOptions): Promise<void>;
	enable(): Promise<void>;
	disable(): Promise<void>;
}

// ============ Agent Types ============

/** Agent with actions */
export interface AgentRef {
	readonly id: AgentId;
	createTunnel(options: CreateTunnelOptions): Promise<TunnelRef>;
	/** Delete this agent */
	delete(): Promise<void>;
	/** Rename this agent */
	rename(newName: string): Promise<void>;
	/** Get the tunnels for this agent */
	tunnels: readonly TunnelRef[];
}

/**
 * Minimal agent ref for operations by ID only.
 * Use when the agent is not in codegen (e.g. newly created or from another source).
 */
export interface AgentRefById {
	readonly id: AgentId;
	/** Create a new tunnel for this agent
	 * @param options - The options for the tunnel creation.
	 * @param waitForAllocation - If true, the function will wait for the allocation to be created before returning.
	 * @returns The allocation data for the tunnel if waitForAllocation is true and nothing otherwise.
	 */
	createTunnel(options: CreateTunnelOptions): Promise<TunnelRef>;
	delete(): Promise<void>;
	rename(newName: string): Promise<void>;
}