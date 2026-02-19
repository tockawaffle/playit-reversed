/**
 * Action implementations for PlayIt API
 * 
 * These functions are imported by the generated playit.ts file.
 * They use the bfetch-schemas for actual API calls.
 */

import Debug from "debug";
import type z from "zod";
import { createPlayItFetch } from "./main/bfetch";
import { tunnelsCreateInputSchema, tunnelsListOutputSchema } from "./main/bfetch/schemas";
import type { CreateTunnelOptions, UpdateTunnelOptions } from "./templates/types";

const debugCSITAction = Debug("playit:actions:createStaticIpTunnel");

// Create a shared fetch instance
const $fetch = createPlayItFetch();

/**
 * Delete a tunnel by ID
 */
export async function deleteTunnel(tunnelId: string): Promise<boolean> {
	const { data, error } = await $fetch("@post/tunnels/delete", {
		body: JSON.stringify({
			tunnel_id: tunnelId,
		}),
		method: "POST",
	});

	if (error) {
		throw new Error(`Failed to delete tunnel ${tunnelId}: ${error.message}`);
	}
	if (data.status !== "success") {
		throw new Error(`Failed to delete tunnel ${tunnelId}: unexpected status ${data.status}`);
	}

	return data.status === "success";
}

/**
 * Rename a tunnel
 */
export async function renameTunnel(tunnelId: string, name: string): Promise<void> {
	throw new Error("Not implemented yet. API endpoint not discovered.");
}

/**
 * Update a tunnel (currently only supports renaming)
 */
export async function updateTunnel(tunnelId: string, options: UpdateTunnelOptions): Promise<void> {
	if (options.name) {
		await renameTunnel(tunnelId, options.name);
	}
	// TODO: Implement localPort and localIp updates when API is available
	if (options.localPort !== undefined || options.localIp !== undefined) {
		console.warn("updateTunnel: localPort and localIp updates are not yet implemented");
	}
}

/**
 * Enable a tunnel
 */
export async function enableTunnel(tunnelId: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`enableTunnel(${tunnelId}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Disable a tunnel
 */
export async function disableTunnel(tunnelId: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`disableTunnel(${tunnelId}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`deleteAgent(${agentId}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Rename an agent
 */
export async function renameAgent(agentId: string, newName: string): Promise<void> {
	// TODO: Implement when API endpoint is discovered
	throw new Error(`renameAgent(${agentId}, ${newName}) - Not implemented yet. API endpoint not discovered.`);
}

/**
 * Allocation data returned from createStaticIpTunnel
 */
export type AllocationResult = (
	| {
		/**
		 * @warning "PublicAllocationPending" is the only status that the PlayIt API returns when a tunnel is created, all other statuses are internal to this library and are here only for convenience.
		*/
		readonly status: "InternalAllocated";
		readonly data: z.infer<typeof tunnelsListOutputSchema.shape.data>
	} |
	{
		/**
		 * @warning "PublicAllocationPending" is the only status that the PlayIt API returns when a tunnel is created, all other statuses are internal to this library and are here only for convenience.
		*/
		readonly status: "PublicAllocationPending";
	}
)

async function checkAllocationStatus(tunnelId: string): Promise<AllocationResult> {
	// Fetch the tunnel data from the API response until the allocation is created
	const { data: newTunnel, error: newTunnelError } = await $fetch("@post/v1/tunnels/list");

	if (newTunnelError) {
		throw new Error(`Failed to fetch tunnel data: ${newTunnelError.message}`);
	}

	// This endpoint usually returns all tunnels for the account, so we need to find the one that was just created
	const validateResponse = tunnelsListOutputSchema.safeParse(newTunnel);
	if (!validateResponse.success) {
		throw new Error(`Failed to validate tunnel data: ${validateResponse.error.message}`);
	}

	// Find the tunnel in the response
	const tunnel = validateResponse.data.data.tunnels.find(tunnel => tunnel.id === tunnelId);
	if (!tunnel) {
		throw new Error(`Tunnel not found in response: ${tunnelId}`);
	} else if (
		[...(tunnel.offline_reasons ?? []), ...(tunnel.port_allocation_requests?.map(request => request.status) ?? [])].includes("PublicAllocationPending")
	) {
		return {
			status: "PublicAllocationPending",
		}
	}

	return {
		status: "InternalAllocated",
		data: {
			tunnels: [tunnel],
		},
	}
}

/**
 * 
 * @param options - The options for the tunnel creation.
 * @param waitForCreation - Whether to wait for the tunnel to be created. This creates a blocking call that will wait for the tunnel to be created before returning. Will timeout after 5 seconds
 * @returns 
 */
export async function CreateTunnel(
	options: CreateTunnelOptions & { agentId: string },
	waitForCreation: boolean = true,
) {
	const body = {
		...options,
		enabled: true,
		origin: {
			type: "agent",
			data: {
				agent_id: options.agentId,
				config: options.config,
			},
		},
	} satisfies z.infer<typeof tunnelsCreateInputSchema>

	const { data, error } = await $fetch("@post/v1/tunnels/create", {
		body,
		method: "POST",
	});
	if (error) {
		throw new Error(`Failed to create tunnel: ${error.message}`);
	}

	if (waitForCreation) {
		for (let elapsed = 0; elapsed < 5 * 60 * 1000; elapsed += 2000) {
			const result = await checkAllocationStatus(data.data.id);
			if (result.status === "InternalAllocated") {
				return result.data.tunnels[0];
			}
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		throw new Error("Timeout waiting for tunnel allocation");
	}

	return data.data;
}


/**
 * Fetches all tunnels for the account.
 * Good if you want to get all tunnels for the account and then filter them by your own criteria.
 */
export async function GetTunnels(): Promise<z.infer<typeof tunnelsListOutputSchema.shape.data.shape.tunnels>> {
	const { data, error } = await $fetch("@post/v1/tunnels/list");
	if (error) {
		throw new Error(`Failed to fetch tunnels: ${error.message}`);
	}
	return data.data.tunnels;
}

/**
 * Fetches a tunnel by its MAIN ID.
 * @param tunnelId - The MAIN ID of the tunnel. Do not use the "alloc" id.
 * @returns 
 */
export async function GetTunnel(tunnelId: string): Promise<z.infer<typeof tunnelsListOutputSchema.shape.data.shape.tunnels>[number]> {
	const tunnels = await GetTunnels();
	const tunnel = tunnels.find(tunnel => tunnel.id === tunnelId);
	if (!tunnel) {
		throw new Error(`Tunnel not found: ${tunnelId}`);
	}
	return tunnel;
}