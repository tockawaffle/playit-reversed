/**
 * Action implementations for PlayIt API
 * 
 * These functions are imported by the generated playit.ts file.
 * They use the bfetch-schemas for actual API calls.
 */

import Debug from "debug";
import { createPlayItFetch } from "./main/bfetch";
import type { AddDedicatedIpSchemaBody } from "./main/bfetch/schemas/add-dedicated-ip";
import type { AddSharedSchemaBody } from "./main/bfetch/schemas/add-shared";
import { allocationOutputSchema, type IpAllocation, type Tunnel, type TunnelAllocData } from "./main/bfetch/schemas/settings-allocations";
import type { CreateRegionTunnelOptions, CreateStaticIpTunnelOptions, UpdateTunnelOptions } from "./templates/types";

const debugCSITAction = Debug("playit:actions:createStaticIpTunnel");

// Create a shared fetch instance
const $fetch = createPlayItFetch();

/**
 * Delete a tunnel by ID
 */
export async function deleteTunnel(tunnelId: string, csrfToken: string): Promise<void> {
	const { error } = await $fetch("@post/account/tunnels/:tunnelId/delete", {
		params: { tunnelId },
		body: { _csrf_token: csrfToken },
	});
	if (error) {
		throw new Error(`Failed to delete tunnel ${tunnelId}: ${error.message}`);
	}
}

/**
 * Rename a tunnel
 */
export async function renameTunnel(tunnelId: string, name: string, csrfToken: string): Promise<void> {
	const { error } = await $fetch("@post/account/tunnels/:tunnelId/rename", {
		params: { tunnelId },
		body: { _csrf_token: csrfToken, name },
	});
	if (error) {
		throw new Error(`Failed to rename tunnel ${tunnelId}: ${error.message}`);
	}
}

/**
 * Update a tunnel (currently only supports renaming)
 */
export async function updateTunnel(tunnelId: string, options: UpdateTunnelOptions, csrfToken: string): Promise<void> {
	if (options.name) {
		await renameTunnel(tunnelId, options.name, csrfToken);
	}
	// TODO: Implement localPort and localIp updates when API is available
	if (options.localPort !== undefined || options.localIp !== undefined) {
		console.warn("updateTunnel: localPort and localIp updates are not yet implemented");
	}
}

/**
 * Enable a tunnel
 */
export async function enableTunnel(tunnelId: string, csrfToken: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`enableTunnel(${tunnelId}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Disable a tunnel
 */
export async function disableTunnel(tunnelId: string, csrfToken: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`disableTunnel(${tunnelId}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string, csrfToken: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`deleteAgent(${agentId}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Rename an agent
 */
export async function renameAgent(agentId: string, newName: string, csrfToken: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`renameAgent(${agentId}, ${newName}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Allocation data returned from createStaticIpTunnel
 */
export type AllocationResult = {
	readonly ipHostname: string;
} & (
		| { readonly status: "pending" }
		| { readonly status: "allocated"; readonly data: TunnelAllocData & { mainId: string } }
		| { readonly status: "disabled"; readonly reason: NonNullable<NonNullable<TunnelAllocData>["reason"]> }
	);

async function checkAllocationStatus(data: { allocation: string, status: number }, ipHostname: string): Promise<AllocationResult> {
	const newData = data as {
		allocation: string,
		status: number
	}
	// Fetch the tunnel data from the API response until the allocation is created
	const { data: newTunnel, error: newTunnelError } = await $fetch("@get/account/settings/allocations");

	if (newTunnelError) {
		throw new Error(`Failed to fetch tunnel data: ${newTunnelError.message}`);
	}

	// This endpoint usually returns all tunnels for the account, so we need to find the one that was just created
	const validateResponse = allocationOutputSchema.safeParse(newTunnel);
	if (!validateResponse.success) {
		throw new Error(`Failed to validate tunnel data: ${validateResponse.error.message}`);
	}

	// Find the tunnel in the response
	const tunnel = validateResponse.data.state.loaderData["routes/account"].tunnels.tunnels.find(tunnel => tunnel.id === newData.allocation);
	if (!tunnel) {
		throw new Error(`Tunnel not found in response: ${newData.allocation}`);
	} else if (tunnel.alloc.status === "pending") {
		debugCSITAction(`Allocation is pending for tunnel ${newData.allocation}`);
		return {
			ipHostname: ipHostname,
			status: "pending"
		}
	}

	debugCSITAction(`Allocation is allocated for tunnel ${newData.allocation}`);
	return {
		ipHostname: tunnel.alloc.data!.ip_hostname || "",
		status: "allocated",
		data: {
			...tunnel.alloc.data!,
			mainId: tunnel.id
		}
	}
}


/**
 * Create a static IP tunnel for an agent
 * 
 * @param agentId - The ID of the agent to create the tunnel for.
 * @param options - The options for the tunnel creation.
 * @param waitForAllocation - If true, the function will wait for the allocation to be created before returning.
 * @param waitForAllocatedStatus - If true, the function will wait for the allocation to be allocated before returning. If using this, you should also set waitForAllocation to true.
 * @returns The allocation data for the tunnel if waitForAllocation is true and waitForAllocatedStatus is true and nothing otherwise.
 */
export async function createStaticIpTunnel(
	agentId: string,
	options: CreateStaticIpTunnelOptions,
	waitForAllocation: boolean = true,
	waitForAllocatedStatus: boolean = false
): Promise<AllocationResult> {
	const tunnelType = options.tunnel_type;
	const isPortType = tunnelType === "both" || tunnelType === "tcp" || tunnelType === "udp";

	const body: AddDedicatedIpSchemaBody = isPortType
		? {
			_csrf_token: options.__csrf_token,
			dedicated_ip: options.dedicated_ip,
			tunnel_type: tunnelType,
			enabled: "on",
			"tunnel-desc": options["tunnel-desc"],
			public_port: options.public_port,
			port_count: options.port_count,
		}
		: {
			_csrf_token: options.__csrf_token,
			dedicated_ip: options.dedicated_ip,
			tunnel_type: tunnelType,
			enabled: "on",
			public_port: options.public_port,
		};

	debugCSITAction("Creating tunnel with body: %O", body);

	// Map options to API format
	const { data, error } = await $fetch("@post/account/agents/:agentId/tunnels/add/dedicated-ip", {
		params: { agentId },
		body
	});

	if (error) {
		throw new Error(`Failed to create tunnel: ${error.message}`);
	}

	if (waitForAllocation) {
		// Currently, this is technically not correct as the correct way to do this is by polling the allocation id endpoint until it is allocated, but this also works so I'll leave it for now.

		if (waitForAllocatedStatus) {
			debugCSITAction("Waiting for allocation to be allocated");
			const allocData = data as { allocation: string; status: number };
			for (let elapsed = 0; elapsed < 5 * 60 * 1000; elapsed += 2000) {
				const result = await checkAllocationStatus(allocData, options.dedicated_ip);
				if (result.status !== "pending") {
					debugCSITAction("Allocation is not pending, returning result");
					return result;
				}
				debugCSITAction("Allocation is pending, waiting +2 seconds before checking again");
				await new Promise(r => setTimeout(r, 2000));
			}
			throw new Error("Allocation did not complete within 5 minutes");
		}

		return await checkAllocationStatus(data as { allocation: string; status: number }, options.dedicated_ip);
	}

	return {
		ipHostname: options.dedicated_ip,
		status: "disabled",
		reason: "Not checking for allocation status, tunnel is not actually disabled but could be pending.",
	};
}

const debugCRTAction = Debug("playit:actions:createRegionTunnel");

export async function createRegionTunnel(
	agentId: string,
	options: CreateRegionTunnelOptions,
	waitForAllocation: boolean = true,
	waitForAllocatedStatus: boolean = false
): Promise<AllocationResult> {
	const tunnelType = options.tunnelType;
	const isPortType = tunnelType === "both" || tunnelType === "tcp" || tunnelType === "udp";

	const body: AddSharedSchemaBody = isPortType
		? {
			user: options.user,
			__csrf_token: options.csrfToken,
			enabled: "on",
			region: options.region as AddSharedSchemaBody["region"],
			tunnel_type: tunnelType,
			"tunnel-desc": options.tunnelCreationReason,
			local_port: options.localPort,
			port_count: options.portCount,
		}
		: {
			user: options.user,
			__csrf_token: options.csrfToken,
			region: options.region as AddSharedSchemaBody["region"],
			tunnel_type: tunnelType,
			enabled: "on",
		};

	debugCRTAction("Creating tunnel with body: %O", body);

	// Map options to API format
	const { data, error } = await $fetch("@post/account/agents/:agentId/tunnels/add", {
		params: { agentId },
		body
	});

	if (error) {
		throw new Error(`Failed to create tunnel: ${error.message}`);
	}

	if (waitForAllocation) {
		if (waitForAllocatedStatus) {
			debugCRTAction("Waiting for allocation to be allocated");
			const allocData = data as { allocation: string; status: number };
			for (let elapsed = 0; elapsed < 5 * 60 * 1000; elapsed += 2000) {
				const result = await checkAllocationStatus(allocData, options.region);
				if (result.status !== "pending") {
					debugCRTAction("Allocation is not pending, returning result");
					return result;
				}
				debugCRTAction("Allocation is pending, waiting +2 seconds before checking again");
				await new Promise(r => setTimeout(r, 2000));
			}
			throw new Error("Allocation did not complete within 5 minutes");
		}

		return await checkAllocationStatus(data as { allocation: string; status: number }, options.region);
	}

	// TODO: Return actual allocation data from API response
	// For now, return placeholder data
	return {
		ipHostname: options.region,
		status: "disabled",
		reason: "Not checking for allocation status",
	};
}

/**
 * Fetches all tunnels for the account.
 * Good if you want to get all tunnels for the account and then filter them by your own criteria.
 */
export async function GetTunnels(): Promise<Tunnel[]> {
	const { data, error } = await $fetch("@get/account/settings/allocations");
	if (error) {
		throw new Error(`Failed to fetch tunnels: ${error.message}`);
	}
	return data.state.loaderData["routes/account"].tunnels.tunnels;
}

/**
 * Fetches a tunnel by its MAIN ID.
 * @param tunnelId - The MAIN ID of the tunnel. Do not use the "alloc" id.
 * @returns 
 */
export async function GetTunnel(tunnelId: string): Promise<Tunnel> {
	const tunnels = await GetTunnels();
	const tunnel = tunnels.find(tunnel => tunnel.id === tunnelId);
	if (!tunnel) {
		throw new Error(`Tunnel not found: ${tunnelId}`);
	}
	return tunnel;
}

/**
 * Fetches all available allocations for the account.
 * @returns All available allocations for the account.
 */
export async function GetAvailableAllocations(): Promise<IpAllocation[]> {
	const { data, error } = await $fetch("@get/account/settings/allocations");
	if (error) {
		throw new Error(`Failed to fetch allocations: ${error.message}`);
	}
	return data.state.loaderData["routes/account/settings/allocations"].ips.filter((ip): ip is NonNullable<typeof ip> => ip !== undefined);
}