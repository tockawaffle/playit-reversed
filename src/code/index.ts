import Debug from "debug";
import { validate as uuidValidate } from "uuid";

/** IGNORE_START */
import { createFetch } from "@better-fetch/fetch";
import {
	regenerate,
	tunnels
} from "../../generated/playit";
import type { AgentId, CreateTunnelOptions } from "../../generated/types";
import type { AllocationData as AllocationDataResponse, PlayitResponse } from "./types";
/** IGNORE_END */

const debug = Debug("playit:createStaticIpTunnel");
const debugError = Debug("playit:createStaticIpTunnel:error");

class PlayItClient {
	private static baseUrl = "https://playit.gg";
	private static authorizationToken: string = process.env.PLAYIT_API_KEY || "";
	private static readonly DEFAULT_HEADERS = {
		'accept': '*/*',
		'accept-language': 'pt-BR,pt;q=0.9',
		'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
		'dnt': '1',
		'origin': 'https://playit.gg',
		'priority': 'u=1, i',
		'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
		'sec-fetch-dest': 'empty',
		'sec-fetch-mode': 'cors',
		'sec-fetch-site': 'same-origin',
		'sec-gpc': '1',
		'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
	} as const;

	private static $fetch = createFetch({
		baseURL: this.baseUrl,
		headers: {
			"Cookie": "__session=" + this.authorizationToken,
			...this.DEFAULT_HEADERS,
		}
	})

	/**
	 * Create a new static IP tunnel for an agent.
	 * This is being tested and I do not guarantee it will work.
	 * @param agentId - The ID of the agent to create the tunnel for.
	 * @param options - The options for the tunnel to create.
	 * @param options.ipHostname - The IP hostname to use for the tunnel.
	 * @param options.localPort - The local port to use for the tunnel.
	 * @param options.portType - The type of port to use for the tunnel.
	 * @param options.description - The description of the tunnel.
	 * @returns
	 */
	public static async createStaticIpTunnel(agentId: AgentId, options: Omit<CreateTunnelOptions, "tunnelType">): Promise<AllocationDataResponse> {
		debug("Starting tunnel creation for agent: %s", agentId);
		debug("Options: %o", {
			ipHostname: options.ipHostname,
			localPort: options.localPort,
			portType: options.portType,
			description: options.description,
		});

		// Check for conflicting tunnel
		const knownTunnel = Object.values(tunnels).find(
			tunnel =>
				tunnel.origin.localPort === options.localPort &&
				tunnel.portType === options.portType &&
				tunnel.origin.agentId === agentId
		);
		if (knownTunnel) {
			debugError("Conflict detected: Tunnel \"%s\" already exists with same local port (%d) and port type (%s)", knownTunnel.name, options.localPort, options.portType);
			throw new Error(`A tunnel with the same local port and port type already exists: ${knownTunnel.name} for agent ${agentId}`);
		}

		// Fetch CSRF token
		const csrfUrl = `/account/agents/${agentId}/tunnels/add/dedicated-ip?accepted=true&_data=routes%2Faccount`;
		debug("Fetching CSRF token from: %s", csrfUrl);
		// Note: This will return 204 even if there's an error, so we cannot rely on response status
		const { data: csrfToken, error: csrfError } = await this.$fetch(csrfUrl, { method: "GET" });

		if (csrfError) {
			debugError("CSRF token fetch failed: %o", csrfError);
			throw new Error(`Failed to create tunnel: ${csrfError.message}`);
		}
		if (!csrfToken || typeof csrfToken !== "object" || !("csrfToken" in csrfToken)) {
			debugError("CSRF token validation failed. Token data: %o", csrfToken);
			throw new Error("Failed to create tunnel: CSRF token not found\nThis could be a bad session token or the API is down");
		}
		debug("CSRF token obtained successfully");

		// Create tunnel via POST
		const tunnelUrl = `/account/agents/${agentId}/tunnels/add/dedicated-ip?accepted=true&_data=routes%2Faccount%2Fagents%2F%24agentId%2Ftunnels%2Fadd%2Fdedicated-ip`;
		const formData = new URLSearchParams({
			_csrf_token: String(csrfToken.csrfToken),
			dedicated_ip: options.ipHostname || "",
			tunnel_type: options.portType || "",
			"tunnel-desc": options.description,
			public_port: Number(options.localPort).toString(),
			port_count: "",
			enabled: "on",
		});

		debug("Creating tunnel via POST to: %s", tunnelUrl);
		const tunnelUuid = await new Promise<string>((resolve, reject) => {
			this.$fetch(tunnelUrl, {
				headers: {
					"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
					...this.DEFAULT_HEADERS,
					"referer": `https://playit.gg/account/agents/${agentId}/tunnels/add/dedicated-ip?accepted=true`,
					"Cookie": "__session=" + this.authorizationToken,
				},
				method: "POST",
				body: formData.toString(),
				onResponse: (response) => {
					const status = response.response.status;
					const redirectHeader = response.response.headers.get("X-Remix-Redirect");
					const statusHeader = response.response.headers.get("X-Remix-Status");

					// Validate response: 204 status, redirect header present, status header is 302
					if (status !== 204 || !redirectHeader || statusHeader !== "302") {
						debugError("Response validation failed. Status: %d, Redirect: %s, StatusHeader: %s", status, redirectHeader, statusHeader);
						reject(new Error("Failed to create tunnel"));
						return;
					}

					// Extract and validate UUID from redirect header (format: /account/tunnels/{uuid})
					const uuid = redirectHeader.split("/").pop();
					if (!uuid || !uuidValidate(uuid)) {
						debugError("Failed to extract or validate UUID from redirect: %s", redirectHeader);
						reject(new Error("Failed to create tunnel"));
						return;
					}

					debug("UUID validated successfully: %s", uuid);
					resolve(uuid);
				},
			}).catch(reject);
		});

		// Poll for tunnel allocation
		const allocation = await this.pollForAllocation(tunnelUuid, options.regenerate);
		debug("✓ Tunnel creation and allocation completed successfully");
		return allocation;
	}

	/**
	 * Poll for tunnel allocation until it's allocated or max attempts reached.
	 */
	private static async pollForAllocation(tunnelUuid: string, shouldRegenerate?: boolean): Promise<AllocationDataResponse> {
		const maxAttempts = 6;
		const delayMs = 3000;

		debug("Starting polling loop for tunnel %s (max %d attempts, %dms delay)", tunnelUuid, maxAttempts, delayMs);

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			debug("Polling attempt %d/%d for tunnel %s", attempt, maxAttempts, tunnelUuid);

			try {
				const tunnelUrl = `/account/tunnels/${tunnelUuid}?_data=routes%2Faccount`;
				const { data: tunnelData, error: tunnelError } = await this.$fetch<PlayitResponse>(tunnelUrl, { method: "GET" });

				if (tunnelError) {
					if (attempt === maxAttempts) {
						throw new Error(`Failed to fetch tunnel status after ${maxAttempts} attempts: ${tunnelError.message}`);
					}
					await new Promise(resolve => setTimeout(resolve, delayMs));
					continue;
				}

				const tunnel = tunnelData?.tunnels?.tunnels?.find(t => t.id === tunnelUuid);
				if (!tunnel) {
					if (attempt === maxAttempts) {
						throw new Error(`Tunnel ${tunnelUuid} not found after ${maxAttempts} attempts`);
					}
					await new Promise(resolve => setTimeout(resolve, delayMs));
					continue;
				}

				debug("Tunnel found. Current allocation status: %s", tunnel.alloc.status);

				if (tunnel.alloc.status === "allocated") {
					debug("✓ Tunnel %s is now allocated!", tunnelUuid);
					if (tunnel.alloc.data) {
						debug("Allocation details: %o", {
							id: tunnel.alloc.data.id,
							ipHostname: tunnel.alloc.data.ip_hostname,
							staticIp4: tunnel.alloc.data.static_ip4,
							staticIp6: tunnel.alloc.data.static_ip6,
							assignedDomain: tunnel.alloc.data.assigned_domain,
							portStart: tunnel.alloc.data.port_start,
							portEnd: tunnel.alloc.data.port_end,
							region: tunnel.alloc.data.region,
						});
					}

					if (shouldRegenerate) {
						debug("Regenerating tunnel %s (non-blocking)", tunnelUuid);
						regenerate().catch((error) => {
							debugError("Failed to regenerate tunnel %s (non-fatal): %o", tunnelUuid, error);
						});
					}

					if (!tunnel.alloc.data) {
						throw new Error("Tunnel is allocated but allocation data is missing");
					}

					return tunnel.alloc.data;
				}

				if (attempt < maxAttempts) {
					debug("Tunnel not yet allocated (status: %s). Waiting %dms before next attempt...", tunnel.alloc.status, delayMs);
					await new Promise(resolve => setTimeout(resolve, delayMs));
				} else {
					throw new Error(`Tunnel ${tunnelUuid} did not become allocated after ${maxAttempts} attempts. Current status: ${tunnel.alloc.status}`);
				}
			} catch (error) {
				if (attempt === maxAttempts) {
					throw error instanceof Error ? error : new Error(`Unexpected error: ${String(error)}`);
				}
				debugError("Attempt %d/%d failed: %o", attempt, maxAttempts, error);
				await new Promise(resolve => setTimeout(resolve, delayMs));
			}
		}

		throw new Error(`Failed to allocate tunnel ${tunnelUuid} after ${maxAttempts} attempts`);
	}
}