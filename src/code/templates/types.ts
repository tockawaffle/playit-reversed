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
import type { AllocationResult } from "../actions";
import type {
	AccountData,
	Agent as ApiAgent,
	IpAllocation as ApiIpAllocation,
	Tunnel as ApiTunnel,
	TunnelAllocData as ApiTunnelAllocData
} from "../main/bfetch/schemas/settings-allocations";
import { type RegionValue } from "../main/regions";

export type { AccountData, ApiTunnel };

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
export type CreateStaticIpTunnelOptions = {
	dedicated_ip: string;
	__csrf_token: string;
	public_port: number;
	readonly enabled: "on" | "off";
} & (
		| {
			tunnel_type: ApiTunnel["port_type"];
			"tunnel-desc": string;
			port_count: number;
		}
		| {
			tunnel_type: Exclude<ApiTunnel["tunnel_type"], "both" | "tcp" | "udp" | null>;
		}
	)

export type CreateRegionTunnelOptions = {
	user: AccountData["account"]
	csrfToken: string;
	region: RegionValue;
} & (
		{
			tunnelType: Extract<ApiTunnel["tunnel_type"], "both" | "tcp" | "udp">;
			tunnelCreationReason: string;
			localPort: number;
			portCount: number;
		} | {
			tunnelType: Exclude<ApiTunnel["tunnel_type"], "both" | "tcp" | "udp" | null>;
		}
	)

/** Tunnel update options */
export interface UpdateTunnelOptions {
	name?: string;
	localPort?: number;
	localIp?: string;
}

/**
 * Tunnel allocation when status is "allocated"
 * Based on ApiTunnelAllocData with camelCase property names
 */
export interface AllocatedTunnelAlloc {
	readonly status: "allocated";
	readonly data: NonNullable<NonNullable<ApiTunnelAllocData>>;
}

/** Tunnel allocation when status is "pending" */
export interface PendingTunnelAlloc {
	readonly status: "pending";
}

/** Tunnel allocation when status is "disabled" */
export interface DisabledTunnelAlloc {
	readonly status: "disabled";
	readonly reason: NonNullable<NonNullable<ApiTunnelAllocData>["reason"]>;
}

/** Tunnel allocation - discriminated union based on status (matches API schema) */
export type TunnelAlloc = AllocatedTunnelAlloc | PendingTunnelAlloc | DisabledTunnelAlloc;

/** Tunnel with actions */
export interface TunnelRef extends ApiTunnel {
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
	readonly id: ApiTunnel["id"];
	delete(): Promise<void>;
	update(options: UpdateTunnelOptions): Promise<void>;
	enable(): Promise<void>;
	disable(): Promise<void>;
}

// ============ Agent Types ============

/** Agent with actions */
export interface AgentRef extends ApiAgent {
	/** Create a new tunnel for this agent
	 * @param options - The options for the tunnel creation.
	 * @param waitForAllocation - If true, the function will wait for the allocation to be created before returning.
	 * @returns The allocation data for the tunnel if waitForAllocation is true and nothing otherwise.
	 */
	createStaticIpTunnel(options: CreateStaticIpTunnelOptions, waitForAllocation: boolean, waitForAllocatedStatus: boolean): Promise<AllocationResult>;
	/** Create a new region tunnel for this agent
	 * @param options - The options for the tunnel creation.
	 * @param waitForAllocation - If true, the function will wait for the allocation to be created before returning.
	 * @returns The allocation data for the tunnel if waitForAllocation is true and nothing otherwise.
	 */
	createRegionTunnel(options: CreateRegionTunnelOptions, waitForAllocation: boolean, waitForAllocatedStatus: boolean): Promise<AllocationResult>;
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
	readonly id: ApiAgent["id"];
	/** Create a new tunnel for this agent
	 * @param options - The options for the tunnel creation.
	 * @param waitForAllocation - If true, the function will wait for the allocation to be created before returning.
	 * @returns The allocation data for the tunnel if waitForAllocation is true and nothing otherwise.
	 */
	createStaticIpTunnel(options: CreateStaticIpTunnelOptions, waitForAllocation: boolean, waitForAllocatedStatus: boolean): Promise<AllocationResult>;
	/** Create a new region tunnel for this agent
	 * @param options - The options for the tunnel creation.
	 * @param waitForAllocation - If true, the function will wait for the allocation to be created before returning.
	 * @returns The allocation data for the tunnel if waitForAllocation is true and nothing otherwise.
	 */
	createRegionTunnel(options: CreateRegionTunnelOptions, waitForAllocation: boolean, waitForAllocatedStatus: boolean): Promise<AllocationResult>;
	delete(): Promise<void>;
	rename(newName: string): Promise<void>;
}

// ============ Allocation Types ============

/**
 * IP allocation data
 */
export interface AllocationData {
	readonly ip_hostname: ApiIpAllocation["ip_hostname"];
	readonly sub_id: ApiIpAllocation["sub_id"];
	readonly region: ApiIpAllocation["region"];
	readonly ip_type: ApiIpAllocation["ip_type"];
	readonly gre_target: ApiIpAllocation["gre_target"];
}