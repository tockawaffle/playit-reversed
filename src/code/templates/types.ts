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
	TunnelAllocData as ApiTunnelAllocData,
	TunnelOriginData as ApiTunnelOriginData,
	TunnelRatelimit as ApiTunnelRatelimit,
} from "../main/bfetch/schemas/settings-allocations";
import { type RegionValue } from "../main/regions";

export type { AccountData };

// ============ Codegen Placeholder Types ============
// These are replaced with actual union types during generation

/** Placeholder - replaced with actual agent IDs during generation */
type AgentId = string;

/** Placeholder - replaced with actual agent names during generation */
type AgentName = string;

/** Placeholder - replaced with actual agent keys during generation */
type AgentKey = string;

/** Placeholder - replaced with actual tunnel IDs during generation */
type TunnelId = string;

/** Placeholder - replaced with actual tunnel names during genefration */
type TunnelName = string;

/** Placeholder - replaced with actual tunnel keys during generation */
type TunnelKey = string;

/** Placeholder - replaced with actual allocation keys during generation */
type AllocationKey = string;

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
	dedicated_ip: AllocationKey;
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
	user: AccountData["account"];
	csrfToken: string;
	region: RegionValue;
} & (
		{
			tunnelType: Extract<ApiTunnel["tunnel_type"], "both" | "tcp" | "udp">;
			tunnelCreationReason: string
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
	readonly id: NonNullable<NonNullable<ApiTunnelAllocData>["id"]>;
	readonly ipHostname: NonNullable<NonNullable<ApiTunnelAllocData>["ip_hostname"]>;
	readonly staticIp4: NonNullable<NonNullable<ApiTunnelAllocData>["static_ip4"]>;
	readonly staticIp6: NonNullable<NonNullable<ApiTunnelAllocData>["static_ip6"]>;
	readonly assignedDomain: NonNullable<NonNullable<ApiTunnelAllocData>["assigned_domain"]>;
	readonly assignedSrv: NonNullable<ApiTunnelAllocData>["assigned_srv"];
	readonly tunnelIp: NonNullable<NonNullable<ApiTunnelAllocData>["tunnel_ip"]>;
	readonly portStart: NonNullable<NonNullable<ApiTunnelAllocData>["port_start"]>;
	readonly portEnd: NonNullable<NonNullable<ApiTunnelAllocData>["port_end"]>;
	readonly ipType: NonNullable<NonNullable<ApiTunnelAllocData>["ip_type"]>;
	readonly region: NonNullable<NonNullable<ApiTunnelAllocData>["region"]>;
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

/**
 * Tunnel data structure with camelCase properties
 * Transformed from ApiTunnel for user-friendly access
 */
export interface TunnelData {
	readonly id: TunnelId;
	readonly name: TunnelName;
	readonly tunnelType: ApiTunnel["tunnel_type"];
	readonly portType: ApiTunnel["port_type"];
	readonly portCount: ApiTunnel["port_count"];
	readonly alloc: TunnelAlloc;
	readonly origin: {
		readonly agentId: ApiTunnelOriginData["agent_id"];
		readonly agentName: ApiTunnelOriginData["agent_name"];
		readonly localIp: ApiTunnelOriginData["local_ip"];
		readonly localPort: ApiTunnelOriginData["local_port"];
	};
	readonly domain: ApiTunnel["domain"];
	readonly firewallId: ApiTunnel["firewall_id"];
	readonly ratelimit: ApiTunnelRatelimit extends infer R
	? R extends null
	? null
	: {
		readonly bytesPerSecond: NonNullable<ApiTunnelRatelimit>["bytes_per_second"];
		readonly packetsPerSecond: NonNullable<ApiTunnelRatelimit>["packets_per_second"];
	}
	: null;
	readonly active: ApiTunnel["active"];
	readonly disabledReason: ApiTunnel["disabled_reason"];
	readonly region: ApiTunnel["region"];
	readonly expireNotice: ApiTunnel["expire_notice"];
	readonly proxyProtocol: ApiTunnel["proxy_protocol"];
	readonly hostnameVerifyLevel: ApiTunnel["hostname_verify_level"];
	readonly agentOverLimit: ApiTunnel["agent_over_limit"];
	readonly createdAt: ApiTunnel["created_at"];
}

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
	readonly id: TunnelId;
	delete(): Promise<void>;
	update(options: UpdateTunnelOptions): Promise<void>;
	enable(): Promise<void>;
	disable(): Promise<void>;
}

// ============ Agent Types ============

/**
 * Agent data structure with camelCase properties
 * Transformed from ApiAgent for user-friendly access
 */
export interface AgentData {
	readonly id: AgentId;
	readonly name: AgentName;
	readonly createdAt: ApiAgent["created_at"];
	readonly agentVersion: {
		readonly variantId: ApiAgent["agent_version"]["variant_id"];
		readonly schemaId: ApiAgent["agent_version"]["schema_id"];
		readonly name: ApiAgent["agent_version"]["name"];
		readonly version: ApiAgent["agent_version"]["version"];
		readonly platform: ApiAgent["agent_version"]["platform"];
	};
	readonly selfManaged: ApiAgent["self_managed"];
	readonly status: {
		readonly state: ApiAgent["status"]["state"];
		readonly data: null | {
			readonly dataCenterId: NonNullable<ApiAgent["status"]["data"]>["data_center_id"];
			readonly dataCenterName: NonNullable<ApiAgent["status"]["data"]>["data_center_name"];
			readonly clientAddr: NonNullable<ApiAgent["status"]["data"]>["client_addr"];
			readonly tunnelAddr: NonNullable<ApiAgent["status"]["data"]>["tunnel_addr"];
			readonly activityLatestEpochMs: NonNullable<ApiAgent["status"]["data"]>["activity_latest_epoch_ms"];
			readonly activityStartEpochMs: NonNullable<ApiAgent["status"]["data"]>["activity_start_epoch_ms"];
		};
	};
	readonly routing: {
		readonly type: ApiAgent["routing"]["type"];
	};
	readonly routingDisabledIp6: ApiAgent["routing_disabled_ip6"];
	readonly sortNum: ApiAgent["sort_num"];
	readonly tunnels: readonly TunnelRef[];
}

/** Agent with actions */
export interface AgentRef extends AgentData {
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
 * IP allocation data with camelCase properties
 * Transformed from ApiIpAllocation for user-friendly access
 */
export interface AllocationData {
	readonly ipHostname: ApiIpAllocation["ip_hostname"];
	readonly subId: ApiIpAllocation["sub_id"];
	readonly region: ApiIpAllocation["region"];
	readonly ipType: ApiIpAllocation["ip_type"];
	readonly greTarget: ApiIpAllocation["gre_target"];
}