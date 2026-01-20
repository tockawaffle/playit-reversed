/**
 * PlayIt CLI
 * 
 * Usage:
 *   bun run playit:setup    - Initial setup (prompts for token, fetches data, generates types)
 *   bun run playit:generate - Regenerate types from saved data
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { PlayIt } from "./client";
import type { PlayItData } from "./types";

const ENV_FILE = ".env";
const ENV_KEY = "PLAYIT_API_KEY";
const GENERATED_DIR = "generated";
const DATA_FILE = `${GENERATED_DIR}/playit-data.json`;

async function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function setup() {
	console.log("\n🎮 PlayIt Setup\n");

	// Check for existing token
	let token = process.env[ENV_KEY];

	if (!token) {
		// Check .env file
		if (fs.existsSync(ENV_FILE)) {
			const envContent = fs.readFileSync(ENV_FILE, "utf-8");
			const match = envContent.match(new RegExp(`^${ENV_KEY}=(.+)$`, "m"));
			if (match?.[1]) {
				token = match[1].trim();
			}
		}
	}

	if (!token) {
		console.log("No PlayIt token found.\n");
		console.log("To get your token:");
		console.log("  1. Go to https://playit.gg and log in");
		console.log("  2. Open DevTools (F12) → Application → Cookies");
		console.log("  3. Copy the value of '__session'\n");

		token = await prompt("Enter your PlayIt session token: ");

		if (!token) {
			console.error("❌ Token is required");
			process.exit(1);
		}

		// Save to .env
		const envLine = `${ENV_KEY}=${token}\n # DO NOT REMOVE THIS LINE EVEN AFTER THE CODEGEN HAS BEEN RUN`;
		if (fs.existsSync(ENV_FILE)) {
			const content = fs.readFileSync(ENV_FILE, "utf-8");
			if (!content.includes(ENV_KEY)) {
				fs.appendFileSync(ENV_FILE, envLine);
			}
		} else {
			fs.writeFileSync(ENV_FILE, envLine);
		}
		console.log("✓ Token saved to .env\n");
	} else {
		console.log("✓ Token found\n");
	}

	// Fetch data
	console.log("Fetching data from PlayIt...");

	const client = PlayIt.create({
		authorizationToken: token,
		_skipCodegenCheck: true, // CLI needs to bypass check to generate
	});

	try {
		const data = await client.fetchAll();
		console.log(`✓ Found ${data.agents.length} agent(s)`);

		for (const agent of data.agents) {
			const agentTunnels = data.tunnels.filter(t => t.origin.agentId === agent.id);
			console.log(`  • ${agent.name} (${agent.status}) - ${agentTunnels.length} tunnel(s)`);
		}

		console.log(`\n✓ Found ${data.tunnels.length} tunnel(s)`);

		for (const tunnel of data.tunnels) {
			console.log(`  • ${tunnel.name} (${tunnel.portType}) → ${tunnel.origin.localIp}:${tunnel.origin.localPort}`);
		}

		console.log(`\n✓ Found ${data.allocations.length} IP allocation(s)`);

		for (const alloc of data.allocations) {
			console.log(`  • ${alloc.ipHostname} (${alloc.region}, ${alloc.ipType})`);
		}

		// Save data for regenerate
		if (!fs.existsSync(GENERATED_DIR)) {
			fs.mkdirSync(GENERATED_DIR, { recursive: true });
		}

		if (!fs.existsSync(DATA_FILE)) {
			fs.writeFileSync(DATA_FILE, JSON.stringify({
				...data,
				updatedAt: new Date().toISOString()
			}, null, 2));
		} else {
			fs.writeFileSync(DATA_FILE, JSON.stringify({
				...data,
				updatedAt: new Date().toISOString()
			}, null, 2));
		}

		// Generate types
		await generateTypes(data);

		console.log("\n✅ Setup complete!\n");
		console.log("Usage:");
		console.log('  import { playit } from "./generated/playit";\n');
		console.log("  // Access agents");
		console.log(`  const agent = playit.agents.${data.agents[0]?.name || "my_agent"};`);
		console.log("  console.log(agent.tunnels);\n");
		console.log("  // Access tunnels directly");
		console.log(`  const tunnel = playit.tunnels.${data.tunnels[0]?.name || "my_tunnel"};`);
		console.log("  console.log(tunnel.alloc.assignedDomain);\n");

	} catch (error) {
		console.error("❌ Failed to fetch data:", error);
		process.exit(1);
	}
}

async function generateTypes(data?: PlayItData) {
	// Load from data file if not provided
	if (!data) {
		if (!fs.existsSync(DATA_FILE)) {
			console.error("❌ No data found. Run 'bun run playit:setup' first.");
			process.exit(1);
		}
		data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PlayItData;
	}

	const { agents, tunnels, allocations } = data;

	if (!agents || agents.length === 0) {
		console.error("❌ No agents found");
		process.exit(1);
	}

	// Generate type-safe identifiers
	const toIdentifier = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "_");

	// Handle duplicate tunnel names by appending index
	const tunnelKeyCounts = new Map<string, number>();
	const getTunnelKey = (name: string) => {
		const base = toIdentifier(name);
		const count = tunnelKeyCounts.get(base) || 0;
		tunnelKeyCounts.set(base, count + 1);
		return count === 0 ? base : `${base}_${count + 1}`;
	};

	// Handle duplicate allocation hostnames by appending index
	const allocKeyCounts = new Map<string, number>();
	const getAllocKey = (hostname: string) => {
		// Convert hostname to identifier (e.g., "195.ip.sa.ply.gg" -> "_195_ip_sa_ply_gg")
		const base = toIdentifier(hostname);
		const count = allocKeyCounts.get(base) || 0;
		allocKeyCounts.set(base, count + 1);
		return count === 0 ? base : `${base}_${count + 1}`;
	};

	// Pre-compute keys
	const tunnelKeys = tunnels.map(t => getTunnelKey(t.name));
	const allocKeys = allocations.map(a => getAllocKey(a.ipHostname));

	// Agent types
	const agentIds = agents.map(a => `"${a.id}"`).join(" | ");
	const agentNames = agents.map(a => `"${a.name}"`).join(" | ");
	const agentKeys = agents.map(a => `"${toIdentifier(a.name)}"`).join(" | ");

	// Tunnel types
	const tunnelIds = tunnels.length > 0
		? tunnels.map(t => `"${t.id}"`).join(" | ")
		: "never";
	const tunnelNames = tunnels.length > 0
		? [...new Set(tunnels.map(t => `"${t.name}"`))].join(" | ")
		: "never";
	const tunnelKeyTypes = tunnels.length > 0
		? tunnelKeys.map(k => `"${k}"`).join(" | ")
		: "never";

	// Allocation types
	const allocationKeyTypes = allocations.length > 0
		? allocKeys.map(k => `"${k}"`).join(" | ")
		: "never";

	// Generate tunnel instances
	const tunnelInstances = tunnels.map((t, i) => `    ${tunnelKeys[i]}: {
        id: "${t.id}" as const,
        name: "${t.name}" as const,
        tunnelType: ${t.tunnelType ? `"${t.tunnelType}"` : "null"},
        portType: "${t.portType}" as const,
        portCount: ${t.portCount},
        alloc: {
            status: "${t.alloc.status}",
            id: "${t.alloc.id}",
            ipHostname: "${t.alloc.ipHostname}",
            staticIp4: "${t.alloc.staticIp4}",
            staticIp6: "${t.alloc.staticIp6}",
            assignedDomain: "${t.alloc.assignedDomain}",
            assignedSrv: ${t.alloc.assignedSrv ? `"${t.alloc.assignedSrv}"` : "null"},
            tunnelIp: "${t.alloc.tunnelIp}",
            portStart: ${t.alloc.portStart},
            portEnd: ${t.alloc.portEnd},
            ipType: "${t.alloc.ipType}",
            region: "${t.alloc.region}",
        },
        origin: {
            agentId: "${t.origin.agentId}" as AgentId,
            agentName: "${t.origin.agentName}" as AgentName,
            localIp: "${t.origin.localIp}",
            localPort: ${t.origin.localPort},
        },
        domain: ${t.domain ? `"${t.domain}"` : "null"},
        active: ${t.active},
        region: "${t.region}",
        proxyProtocol: ${t.proxyProtocol ? `"${t.proxyProtocol}"` : "null"},
    }`).join(",\n");

	// Generate agent instances with their tunnels
	const agentInstances = agents.map(a => {
		const agentTunnelRefs = tunnels
			.map((t, i) => ({ tunnel: t, key: tunnelKeys[i] }))
			.filter(({ tunnel }) => tunnel.origin.agentId === a.id)
			.map(({ key }) => `tunnels.${key}`)
			.join(", ");
		return `    ${toIdentifier(a.name)}: {
        id: "${a.id}" as const,
        name: "${a.name}" as const,
        clientIp: "${a.clientIp}",
        tunnelIp: "${a.tunnelIp}",
        version: "${a.version}",
        os: "${a.os}" as const,
        status: "${a.status}" as const,
        tunnels: [${agentTunnelRefs}] as const,
    }`;
	}).join(",\n");

	// Generate allocation instances
	const allocationInstances = allocations.map((a, i) => `    "${allocKeys[i]}": {
        ipHostname: "${a.ipHostname}" as const,
        subId: ${a.subId ? `"${a.subId}"` : "null"},
        region: "${a.region}" as const,
        ipType: "${a.ipType}" as const,
        greTarget: ${a.greTarget ? `"${a.greTarget}"` : "null"},
    }`).join(",\n");

	const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated at: ${new Date().toISOString()}
 * 
 * Regenerate with: bun run playit:setup
 */

import { createFetch } from "@better-fetch/fetch";
import { spawn } from "child_process";

// ============ Types ============

/** All available agent IDs */
export type AgentId = ${agentIds};

/** All available agent names */
export type AgentName = ${agentNames};

/** Agent identifier (property name) */
export type AgentKey = ${agentKeys};

/** All available tunnel IDs */
export type TunnelId = ${tunnelIds};

/** All available tunnel names */
export type TunnelName = ${tunnelNames};

/** Tunnel identifier (property name) */
export type TunnelKey = ${tunnelKeyTypes};

/** Allocation identifier (property name) */
export type AllocationKey = ${allocationKeyTypes};

/** Tunnel creation options */
export interface CreateTunnelOptions {
	description: string;
	localPort: number;
	localIp?: string;
	portType?: "tcp" | "udp" | "both";
	ipHostname?: AllocationKey;
	tunnelType: "dedicated-ip" | "shared-ip" | "shared-port";
}

/** Tunnel update options */
export interface UpdateTunnelOptions {
    name?: string;
    localPort?: number;
    localIp?: string;
}

// ============ Tunnel Data ============

/** Tunnel data structure */
interface TunnelData {
    readonly id: TunnelId;
    readonly name: TunnelName;
    readonly tunnelType: string | null;
    readonly portType: "tcp" | "udp" | "both";
    readonly portCount: number;
    readonly alloc: {
        readonly status: string;
        readonly id: string;
        readonly ipHostname: string;
        readonly staticIp4: string;
        readonly staticIp6: string;
        readonly assignedDomain: string;
        readonly assignedSrv: string | null;
        readonly tunnelIp: string;
        readonly portStart: number;
        readonly portEnd: number;
        readonly ipType: string;
        readonly region: string;
    };
    readonly origin: {
        readonly agentId: AgentId;
        readonly agentName: AgentName;
        readonly localIp: string;
        readonly localPort: number;
    };
    readonly domain: string | null;
    readonly active: boolean;
    readonly region: string;
    readonly proxyProtocol: string | null;
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

// ============ Agent Data ============

/** Agent data structure */
interface AgentData {
    readonly id: AgentId;
    readonly name: AgentName;
    readonly clientIp: string;
    readonly tunnelIp: string;
    readonly version: string;
    readonly os: string;
    readonly status: string;
    readonly tunnels: readonly TunnelRef[];
}

/** Agent with actions */
export interface AgentRef extends AgentData {
    /** Create a new tunnel for this agent */
    createTunnel(options: CreateTunnelOptions): Promise<void>;
    /** Delete this agent */
    delete(): Promise<void>;
    /** Rename this agent */
    rename(newName: string): Promise<void>;
}

// ============ Action Implementations ============

/** 
 * TODO: These actions need to be implemented with actual API calls.
 * For now, they throw errors indicating they're not yet implemented.
 */

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
	 * Create a new tunnel for an agent.
	 * This is being tested and I do not guarantee it will work.
	 * @param agentId - The ID of the agent to create the tunnel for.
	 * @param options - The options for the tunnel to create.
	 * @param options.tunnelType - The type of tunnel to create.
	 * @param options.ipHostname - The IP hostname to use for the tunnel.
	 * @param options.localPort - The local port to use for the tunnel.
	 * @param options.portType - The type of port to use for the tunnel.
	 * @param options.description - The description of the tunnel.
	 * @returns
	 */
	public static async createTunnel(agentId: AgentId, options: CreateTunnelOptions): Promise<void> {
		if (!options.tunnelType) {
			throw new Error("Tunnel type is required, choose between: minecraft-java, minecraft-bedrock, dedicated-ip");
		}

		let urls: { csrf: string, tunnel: string } = { csrf: "", tunnel: "" };
		switch (options.tunnelType) {
			case "dedicated-ip":
				urls.csrf = \`/account/agents/\${ agentId }/tunnels/add/dedicated-ip?accepted=true&_data=routes%2Faccount\`;
				urls.tunnel = \`/account/agents/\${ agentId }/tunnels/add/dedicated-ip?accepted=true&_data=routes%2Faccount%2Fagents%2F%24agentId%2Ftunnels%2Fadd%2Fdedicated-ip\`;
				break;
			case "shared-ip":
			case "shared-port":
			default:
				throw new Error(\`Invalid tunnel type: \${ options.tunnelType } or not yet supported\`);
		}

		const { data: csrfToken, error: csrfError } = await this.$fetch(urls.csrf, {
			method: "GET",
		})

		if (csrfError) {
			console.log(csrfToken)
			throw new Error(\`Failed to create tunnel: \${ csrfError.message }\`);
		} else if (
			!csrfToken ||
			typeof csrfToken !== "object" ||
			"csrfToken" in csrfToken === false
		) {
			throw new Error("Failed to create tunnel: CSRF token not found");
		}

		// Serialize body as form-urlencoded
		const formData = new URLSearchParams({
			_csrf_token: String(csrfToken.csrfToken),
			dedicated_ip: options.ipHostname || "",
			tunnel_type: options.portType || "",
			"tunnel-desc": options.description,
			public_port: Number(options.localPort).toString(),
			port_count: "",
			enabled: "on",
		});

		const { data: tunnel, error: tunnelError } = await this.$fetch(urls.tunnel, {
			headers: {
				"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
				...this.DEFAULT_HEADERS,
				"referer": \`https://playit.gg/account/agents/\${ agentId }/tunnels/add/\${ options.tunnelType }?accepted=true\`,
	"Cookie": "__session=" + this.authorizationToken,
			},
method: "POST",
	body: formData.toString(),
		onRequest: (request) => {
			console.log(request)
		},
			onResponse: (response) => {
				console.log(response.response)
			}
		})

if (tunnelError) {
	throw new Error(\`Failed to create tunnel: \${ tunnelError.message }\`);
}

// The last request returns an empty response with status 204, we should expect a 204 response.

return tunnel as any;
	}
}

async function deleteTunnel(tunnelId: TunnelId): Promise<void> {
	// TODO: Implement DELETE /account/tunnels/:tunnelId
	throw new Error(\`deleteTunnel(\${ tunnelId }) - Not implemented yet. API integration coming soon.\`);
}

async function updateTunnel(tunnelId: TunnelId, options: UpdateTunnelOptions): Promise<void> {
	// TODO: Implement PATCH /account/tunnels/:tunnelId
	throw new Error(\`updateTunnel(\${ tunnelId }, \${ JSON.stringify(options) }) - Not implemented yet.\`);
}

async function enableTunnel(tunnelId: TunnelId): Promise<void> {
	// TODO: Implement POST /account/tunnels/:tunnelId/enable
	throw new Error(\`enableTunnel(\${ tunnelId }) - Not implemented yet.\`);
}

async function disableTunnel(tunnelId: TunnelId): Promise<void> {
	// TODO: Implement POST /account/tunnels/:tunnelId/disable
	throw new Error(\`disableTunnel(\${ tunnelId }) - Not implemented yet.\`);
}

async function deleteAgent(agentId: AgentId): Promise<void> {
	// TODO: Implement DELETE /account/agents/:agentId
	throw new Error(\`deleteAgent(\${ agentId }) - Not implemented yet.\`);
}

async function renameAgent(agentId: AgentId, newName: string): Promise<void> {
	// TODO: Implement PATCH /account/agents/:agentId
	throw new Error(\`renameAgent(\${ agentId }, \${ newName }) - Not implemented yet.\`);
}

// ============ Factory Functions ============

function createTunnelRef(data: TunnelData): TunnelRef {
	return {
		...data,
		delete: () => deleteTunnel(data.id),
		update: (options) => updateTunnel(data.id, options),
		enable: () => enableTunnel(data.id),
		disable: () => disableTunnel(data.id),
	};
}

function createAgentRef(data: Omit<AgentData, 'tunnels'>, tunnelRefs: TunnelRef[]): AgentRef {
	return {
		...data,
		tunnels: tunnelRefs,
		createTunnel: (options) => PlayItClient.createTunnel(data.id, options),
		delete: () => deleteAgent(data.id),
		rename: (newName) => renameAgent(data.id, newName),
	};
}

// ============ Tunnel Instances ============

const _tunnelData = {
${tunnelInstances}
} as const;

/** All tunnels (with actions) */
export const tunnels: { [K in TunnelKey]: TunnelRef } = {
${tunnelKeys.map(key => `    ${key}: createTunnelRef(_tunnelData.${key} as TunnelData)`).join(",\n")}
};

/** Array of all tunnel IDs */
export const ALL_TUNNEL_IDS: TunnelId[] = [${tunnels.map(t => `"${t.id}"`).join(", ")}];

/** Array of all tunnel names */
export const ALL_TUNNEL_NAMES: TunnelName[] = [${tunnels.map(t => `"${t.name}"`).join(", ")}];

// ============ Agent Instances ============

const _agentData = {
${agents.map(a => `    ${toIdentifier(a.name)}: {
        id: "${a.id}" as const,
        name: "${a.name}" as const,
        clientIp: "${a.clientIp}",
        tunnelIp: "${a.tunnelIp}",
        version: "${a.version}",
        os: "${a.os}" as const,
        status: "${a.status}" as const,
    }`).join(",\n")}
} as const;

/** All agents (with actions and their tunnels) */
export const agents: { [K in AgentKey]: AgentRef } = {
${agents.map(a => {
		const agentTunnelRefs = tunnels
			.map((t, i) => ({ tunnel: t, key: tunnelKeys[i] }))
			.filter(({ tunnel }) => tunnel.origin.agentId === a.id)
			.map(({ key }) => `tunnels.${key}`)
			.join(", ");
		return `    ${toIdentifier(a.name)}: createAgentRef(_agentData.${toIdentifier(a.name)} as AgentData, [${agentTunnelRefs}])`;
	}).join(",\n")}
};

/** Map of agent names to IDs */
export const AGENT_IDS = {
${agents.map(a => `    "${a.name}": "${a.id}"`).join(",\n")}
} as const;

/** Array of all agent IDs */
export const ALL_AGENT_IDS: AgentId[] = [${agents.map(a => `"${a.id}"`).join(", ")}];

/** Array of all agent names */
export const ALL_AGENT_NAMES: AgentName[] = [${agents.map(a => `"${a.name}"`).join(", ")}];

// ============ Allocations ============

/** IP allocation data */
export interface AllocationData {
    readonly ipHostname: string;
    readonly subId: string | null;
    readonly region: string;
    readonly ipType: string;
    readonly greTarget: string | null;
}

/** All IP allocations */
export const allocations: { [K in AllocationKey]: AllocationData } = {
${allocationInstances}
};

/** Array of all allocation hostnames */
export const ALL_ALLOCATION_HOSTNAMES: string[] = [${allocations.map(a => `"${a.ipHostname}"`).join(", ")}];

// ============ Regenerate ============

/**
 * Regenerate types by re-fetching from PlayIt API
 */
export async function regenerate(): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn("bun", ["run", "playit:setup"], {
            stdio: "inherit",
            shell: true
        });
        proc.on("close", (code) => {
            if (code === 0) {
                console.log("✓ Types regenerated. Restart your app to use the new types.");
                resolve();
            } else {
                reject(new Error(\`Regeneration failed with code \${code}\`));
            }
        });
        proc.on("error", reject);
    });
}

// ============ PlayIt API ============

/**
 * The PlayIt API
 * 
 * @example
 * \`\`\`ts
 * import { playit } from "./generated/playit";
 * 
 * // Access agents (with their tunnels)
 * const agent = playit.agents.${toIdentifier(agents[0]?.name || "my_agent")};
 * console.log(agent.id);       // "${agents[0]?.id || "..."}"
 * console.log(agent.status);   // "${agents[0]?.status || "..."}"
 * console.log(agent.tunnels);  // All tunnels for this agent
 * 
 * // Agent actions
 * await agent.createTunnel({ name: "SSH", localPort: 22, portType: "tcp" });
 * await agent.rename("new-name");
 * await agent.delete();
 * 
 * // Access tunnels directly
 * const tunnel = playit.tunnels.${tunnelKeys[0] || "my_tunnel"};
 * console.log(tunnel.alloc.assignedDomain);
 * console.log(tunnel.origin.localPort);
 * 
 * // Tunnel actions
 * await tunnel.update({ name: "New Name", localPort: 8080 });
 * await tunnel.disable();
 * await tunnel.enable();
 * await tunnel.delete();
 * 
 * // Regenerate types after changes
 * await playit.regenerate();
 * \`\`\`
 */
export const playit = {
    /** All agents (with actions and their tunnels) */
    agents,
    
    /** All tunnels (with actions) */
    tunnels,
    
    /** All IP allocations */
    allocations,
    
    /** All agent IDs */
    agentIds: ALL_AGENT_IDS,
    
    /** All agent names */
    agentNames: ALL_AGENT_NAMES,
    
    /** All tunnel IDs */
    tunnelIds: ALL_TUNNEL_IDS,
    
    /** All tunnel names */
    tunnelNames: ALL_TUNNEL_NAMES,
    
    /** Regenerate types after changes */
    regenerate,
};

export default playit;
`;

	// Ensure output directory exists
	if (!fs.existsSync(GENERATED_DIR)) {
		fs.mkdirSync(GENERATED_DIR, { recursive: true });
	}

	const outputPath = path.join(GENERATED_DIR, "playit.ts");
	fs.writeFileSync(outputPath, content);
	console.log(`\n✓ Generated types at ${outputPath}`);
}

// CLI entry point
const command = process.argv[2];

switch (command) {
	case "setup":
	case undefined:
		setup();
		break;
	case "generate":
		generateTypes();
		break;
	default:
		console.log("Usage:");
		console.log("  bun run src/cli.ts setup    - Initial setup");
		console.log("  bun run src/cli.ts generate - Regenerate types");
}
