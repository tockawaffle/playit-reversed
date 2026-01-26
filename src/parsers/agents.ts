import type { Agent, Allocation, PlayItData, Tunnel, TunnelAlloc } from "../types";

interface RemixContext {
	state: {
		loaderData: {
			/** This is available by fetching any page */
			"routes/account": {
				tunnels: {
					tunnels: {
						id: string;
						tunnel_type: string | null;
						name: string;
						port_type: string;
						port_count: number;
						alloc: {
							status: string;
							data?: {
								id: string;
								ip_hostname: string;
								static_ip4: string;
								static_ip6: string;
								assigned_domain: string;
								assigned_srv: string | null;
								tunnel_ip: string;
								port_start: number;
								port_end: number;
								ip_type: string;
								region: string;
							};
						};
						origin: {
							type: string;
							data: {
								agent_id: string;
								agent_name: string;
								local_ip: string;
								local_port: number | null;
							};
						};
						domain: string | null;
						active: boolean;
						region: string;
						proxy_protocol: string | null;
					}[];
				};
				agents: {
					agents: {
						id: string;
						name: string;
						agent_version: {
							version: string;
							platform: string;
						};
						status: {
							state: string;
							data: {
								client_addr: string;
								tunnel_addr: string;
							};
						};
					}[];
				};
			};
			/** This becomes available after fetching the allocations page */
			"routes/account/settings/allocations"?: {
				ports: any[];
				ips: {
					ip_hostname: string;
					sub_id: string | null;
					region: string;
					ip_type: string;
					gre_target: string | null;
				}[];
			}
		};
	};
}

/**
 * Extract the Remix context from the HTML
 */
function extractRemixContext(html: string): RemixContext | null {
	const match = html.match(/<script>window\.__remixContext = ([\s\S]*?);<\/script>/);
	if (!match?.[1]) return null;

	try {
		return JSON.parse(match[1]);
	} catch {
		return null;
	}
}

/**
 * Parse all data from the PlayIt HTML page (agents + tunnels)
 */
export function parsePlayItHtml(html: string): PlayItData {
	const context = extractRemixContext(html);
	if (!context) {
		throw new Error("Could not find Remix context in HTML");
	}

	const accountData = context.state.loaderData["routes/account"];

	const agents: Agent[] = accountData.agents.agents.map(agent => ({
		id: agent.id,
		name: agent.name,
		clientIp: agent.status.data.client_addr,
		tunnelIp: agent.status.data.tunnel_addr,
		version: agent.agent_version.version,
		os: agent.agent_version.platform,
		status: agent.status.state,
	}));

	const tunnels: Tunnel[] = accountData.tunnels.tunnels.map(tunnel => {
		// Handle different allocation statuses with discriminated union
		let alloc: TunnelAlloc;
		if (tunnel.alloc.status === "allocated" && tunnel.alloc.data) {
			alloc = {
				status: "allocated" as const,
				id: tunnel.alloc.data.id,
				ipHostname: tunnel.alloc.data.ip_hostname,
				staticIp4: tunnel.alloc.data.static_ip4,
				staticIp6: tunnel.alloc.data.static_ip6,
				assignedDomain: tunnel.alloc.data.assigned_domain,
				assignedSrv: tunnel.alloc.data.assigned_srv,
				tunnelIp: tunnel.alloc.data.tunnel_ip,
				portStart: tunnel.alloc.data.port_start,
				portEnd: tunnel.alloc.data.port_end,
				ipType: tunnel.alloc.data.ip_type,
				region: tunnel.alloc.data.region,
			};
		} else if (tunnel.alloc.status === "pending") {
			alloc = {
				status: "pending" as const,
			};
		} else {
			alloc = {
				status: "unallocated" as const,
			};
		}

		return {
			id: tunnel.id,
			name: tunnel.name,
			tunnelType: tunnel.tunnel_type,
			portType: tunnel.port_type,
			portCount: tunnel.port_count,
			alloc,
			origin: {
				agentId: tunnel.origin.data.agent_id,
				agentName: tunnel.origin.data.agent_name,
				localIp: tunnel.origin.data.local_ip,
				localPort: tunnel.origin.data.local_port ?? 0,
			},
			domain: tunnel.domain,
			active: tunnel.active,
			region: tunnel.region,
			proxyProtocol: tunnel.proxy_protocol,
		};
	});

	let allocations: Allocation[] = [];
	const allocData = context.state.loaderData["routes/account/settings/allocations"];
	if (allocData && typeof allocData === "object" && "ips" in allocData) {
		allocations = allocData.ips.map(ip => ({
			ipHostname: ip.ip_hostname,
			subId: ip.sub_id,
			region: ip.region,
			ipType: ip.ip_type,
			greTarget: ip.gre_target,
		}));
	}

	return { agents, tunnels, allocations };
}

/**
 * Parse the agents HTML page and extract agent data
 * @deprecated Use parsePlayItHtml instead
 */
export function parseAgentsHtml(html: string): Agent[] {
	const context = extractRemixContext(html);
	if (context) {
		return context.state.loaderData["routes/account"].agents.agents.map(agent => ({
			id: agent.id,
			name: agent.name,
			clientIp: agent.status.data.client_addr,
			tunnelIp: agent.status.data.tunnel_addr,
			version: agent.agent_version.version,
			os: agent.agent_version.platform,
			status: agent.status.state,
		}));
	}

	// Fallback to HTML parsing (legacy)
	const table = html.match(/<table class="row-links with-spacing">[\s\S]*?<\/table>/)?.[0];
	if (!table) {
		throw new Error("No table found in HTML");
	}

	const rows = table.match(/<tr>[\s\S]*?<td[\s\S]*?<\/tr>/g);
	if (!rows) {
		throw new Error("No rows found in table");
	}

	return rows.map(parseAgentRow);
}

/**
 * Parse tunnels from HTML
 * @deprecated Use parsePlayItHtml instead
 */
export function parseTunnelsHtml(html: string): Tunnel[] {
	const context = extractRemixContext(html);
	if (!context) {
		throw new Error("Could not find Remix context in HTML");
	}

	return context.state.loaderData["routes/account"].tunnels.tunnels.map(tunnel => {
		// Handle different allocation statuses with discriminated union
		let alloc: TunnelAlloc;
		if (tunnel.alloc.status === "allocated" && tunnel.alloc.data) {
			alloc = {
				status: "allocated" as const,
				id: tunnel.alloc.data.id,
				ipHostname: tunnel.alloc.data.ip_hostname,
				staticIp4: tunnel.alloc.data.static_ip4,
				staticIp6: tunnel.alloc.data.static_ip6,
				assignedDomain: tunnel.alloc.data.assigned_domain,
				assignedSrv: tunnel.alloc.data.assigned_srv,
				tunnelIp: tunnel.alloc.data.tunnel_ip,
				portStart: tunnel.alloc.data.port_start,
				portEnd: tunnel.alloc.data.port_end,
				ipType: tunnel.alloc.data.ip_type,
				region: tunnel.alloc.data.region,
			};
		} else if (tunnel.alloc.status === "pending") {
			alloc = {
				status: "pending" as const,
			};
		} else {
			alloc = {
				status: "unallocated" as const,
			};
		}

		return {
			id: tunnel.id,
			name: tunnel.name,
			tunnelType: tunnel.tunnel_type,
			portType: tunnel.port_type,
			portCount: tunnel.port_count,
			alloc,
			origin: {
				agentId: tunnel.origin.data.agent_id,
				agentName: tunnel.origin.data.agent_name,
				localIp: tunnel.origin.data.local_ip,
				localPort: tunnel.origin.data.local_port ?? 0,
			},
			domain: tunnel.domain,
			active: tunnel.active,
			region: tunnel.region,
			proxyProtocol: tunnel.proxy_protocol,
		};
	});
}

/**
 * Parse a single agent table row (legacy fallback)
 */
function parseAgentRow(row: string): Agent {
	const id = row.match(/href="\/account\/agents\/([a-f0-9-]+)"/)?.[1] ?? "";
	const name = row.match(/<td[^>]*><a[^>]*>([^<]+)<span/)?.[1]?.trim() ?? "";
	const ipCell = row.match(/<td class="monospace[^"]*">[\s\S]*?<\/td>/)?.[0] ?? "";
	const clientIp = ipCell.match(/">([0-9.:]+)<span/)?.[1] ?? "";
	const tunnelIp = ipCell.match(/class="sub-text">([0-9.:]+)<\/span>/)?.[1] ?? "";
	const versionCell = row.match(/<td><a[^>]*>version[\s\S]*?<\/td>/)?.[0] ?? "";
	const version = versionCell.match(/version\s*(?:<!--\s*-->)?\s*([0-9.]+)/)?.[1] ?? "";
	const os = versionCell.match(/os:\s*(?:<!--\s*-->)?\s*(\w+)/)?.[1] ?? "";
	const status = row.match(/class="AgentStatus[^"]*">[\s\S]*?<span>(\w+)<\/span>/)?.[1] ?? "";

	return { id, name, clientIp, tunnelIp, version, os, status };
}
