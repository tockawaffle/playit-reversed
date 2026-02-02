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
import generateGenericCode, { generateTypesFile, generateUserFile, type CodegenConfig } from "./code/generic";
import { allocationOutputSchema, type AccountData, type Agent, type IpAllocation, type Tunnel } from "./code/main/bfetch/schemas/settings-allocations";

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
		const fetchedData = await client.fetchAll();
		console.log(`✓ Found ${fetchedData.agents.length} agent(s)`);

		for (const agent of fetchedData.agents) {
			const agentTunnels = fetchedData.tunnels.filter(t => t.origin.data.agent_id === agent.id);
			const statusState = agent.status.state;
			console.log(`  • ${agent.name} (${statusState}) - ${agentTunnels.length} tunnel(s)`);
		}

		console.log(`\n✓ Found ${fetchedData.tunnels.length} tunnel(s)`);

		for (const tunnel of fetchedData.tunnels) {
			console.log(`  • ${tunnel.name} (${tunnel.port_type}) → ${tunnel.origin.data.local_ip}:${tunnel.origin.data.local_port}`);
		}

		console.log(`\n✓ Found ${fetchedData.allocations.length} IP allocation(s)`);

		for (const alloc of fetchedData.allocations) {
			console.log(`  • ${alloc.ip_hostname} (${alloc.region}, ${alloc.ip_type})`);
		}

		// Save data for regenerate
		if (!fs.existsSync(GENERATED_DIR)) {
			fs.mkdirSync(GENERATED_DIR, { recursive: true });
		}

		const dataToSave = {
			...fetchedData,
			updatedAt: new Date().toISOString()
		};

		fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));

		// Generate types
		await generateTypes(fetchedData);

		console.log("\n✅ Setup complete!\n");
		console.log("Usage:");
		console.log('  import { playit } from "./generated/playit";\n');
		console.log("  // Access agents");
		const firstAgentName = fetchedData.agents[0]?.name || "my_agent";
		console.log(`  const agent = playit.agents.${toIdentifier(firstAgentName)};`);
		console.log("  console.log(agent.tunnels);\n");
		console.log("  // Access tunnels directly");
		const firstTunnelName = fetchedData.tunnels[0]?.name || "my_tunnel";
		console.log(`  const tunnel = playit.tunnels.${toIdentifier(firstTunnelName)};`);
		console.log("  console.log(tunnel.alloc.assignedDomain);\n");

	} catch (error) {
		console.error("❌ Failed to fetch data:", error);
		process.exit(1);
	}
}

// Generate type-safe identifiers
const toIdentifier = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "_");

interface StoredData {
	tunnels: Tunnel[];
	agents: Agent[];
	allocations: IpAllocation[];
	account: AccountData["account"];
	updatedAt?: string;
}

async function generateTypes(data?: StoredData): Promise<void> {
	// Load from data file if not provided
	if (!data) {
		if (!fs.existsSync(DATA_FILE)) {
			console.error("❌ No data found. Run 'bun run playit:setup' first.");
			process.exit(1);
		}
		data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as StoredData;

		// Validate the data using the new schema
		const routesAccount = allocationOutputSchema.shape.state.shape.loaderData.shape["routes/account"];
		const validations = [
			{ key: "tunnels", result: routesAccount.shape.tunnels.shape.tunnels.safeParse(data.tunnels) },
			{ key: "agents", result: routesAccount.shape.agents.shape.agents.safeParse(data.agents) },
			{ key: "allocations", result: allocationOutputSchema.shape.state.shape.loaderData.shape["routes/account/settings/allocations"].shape.ips.safeParse(data.allocations) },
			{ key: "account", result: allocationOutputSchema.shape.state.shape.loaderData.shape["routes/account"].safeParse(data.account) },
		];

		const failures = validations.filter(v => !v.result.success);
		if (failures.length > 0) {
			console.error("❌ Invalid data:");
			failures.forEach(({ key, result }) => console.error(`  ${key}:`, result.error));
			process.exit(1);
		}
	}

	const { agents, tunnels, allocations, account } = data;

	if (!agents || agents.length === 0) {
		console.error("❌ No agents found");
		process.exit(1);
	}

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
	const allocKeys = allocations.map(a => getAllocKey(a.ip_hostname));

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

	// Generate tunnel instances using the new snake_case schema
	const tunnelInstances = tunnels.map((t, i) => {
		// Generate alloc object based on status (discriminated union)
		// The new schema has alloc.data with optional fields based on status
		let allocObject: string;
		if (t.alloc.status === "allocated" && t.alloc.data) {
			const allocData = t.alloc.data;
			allocObject = `{
            status: "allocated" as const,
            id: "${allocData.id || ""}",
            ipHostname: "${allocData.ip_hostname || ""}",
            staticIp4: "${allocData.static_ip4 || ""}",
            staticIp6: "${allocData.static_ip6 || ""}",
            assignedDomain: "${allocData.assigned_domain || ""}",
            assignedSrv: ${allocData.assigned_srv ? `"${allocData.assigned_srv}"` : "null"},
            tunnelIp: "${allocData.tunnel_ip || ""}",
            portStart: ${allocData.port_start ?? 0},
            portEnd: ${allocData.port_end ?? 0},
            ipType: "${allocData.ip_type || ""}",
            region: "${allocData.region || ""}",
        }`;
		} else if (t.alloc.status === "pending") {
			allocObject = `{
            status: "pending" as const,
        }`;
		} else if (t.alloc.status === "disabled" && t.alloc.data?.reason) {
			allocObject = `{
            status: "disabled" as const,
            reason: "${t.alloc.data.reason}",
        }`;
		} else {
			allocObject = `{
            status: "unallocated" as const,
        }`;
		}

		return `    ${tunnelKeys[i]}: {
        id: "${t.id}" as const,
        name: "${t.name}" as const,
        tunnelType: ${t.tunnel_type ? `"${t.tunnel_type}"` : "null"},
        portType: "${t.port_type}" as const,
        portCount: ${t.port_count},
        alloc: ${allocObject},
        origin: {
            agentId: "${t.origin.data.agent_id}" as AgentId,
            agentName: "${t.origin.data.agent_name}" as AgentName,
            localIp: "${t.origin.data.local_ip}",
            localPort: ${t.origin.data.local_port ?? "null"},
        },
        domain: ${t.domain ? `"${t.domain}"` : "null"},
        firewallId: ${t.firewall_id ? `"${t.firewall_id}"` : "null"},
        ratelimit: ${t.ratelimit ? `{ bytesPerSecond: ${t.ratelimit.bytes_per_second}, packetsPerSecond: ${t.ratelimit.packets_per_second} }` : "null"},
        active: ${t.active},
        disabledReason: ${t.disabled_reason ? `"${t.disabled_reason}"` : "null"},
        region: "${t.region}",
        expireNotice: ${t.expire_notice ? `"${t.expire_notice}"` : "null"},
        proxyProtocol: ${t.proxy_protocol ? `"${t.proxy_protocol}"` : "null"},
        hostnameVerifyLevel: "${t.hostname_verify_level}" as const,
        agentOverLimit: ${t.agent_over_limit},
        createdAt: "${t.created_at}",
    }`;
	}).join(",\n");

	// Generate allocation instances using the new snake_case schema
	const allocationInstances = allocations.map((a, i) => `    "${allocKeys[i]}": {
        ipHostname: "${a.ip_hostname}" as const,
        subId: ${a.sub_id ? `"${a.sub_id}"` : "null"},
        region: "${a.region}" as const,
        ipType: "${a.ip_type}" as const,
        greTarget: ${a.gre_target ? `"${a.gre_target}"` : "null"},
    }`).join(",\n");

	const config: CodegenConfig = {
		agentIds,
		agentNames,
		agentKeys,
		tunnelIds,
		tunnelNames,
		tunnelKeyTypes,
		allocationKeyTypes,
		allocationInstances,
		agents,
		tunnelInstances,
		tunnelKeys,
		allocations,
		tunnels,
		toIdentifier,
		user: account
	};

	const content = generateGenericCode(config);
	const typesContent = generateTypesFile(config);
	const userContent = generateUserFile(config);

	// Ensure output directory exists
	if (!fs.existsSync(GENERATED_DIR)) {
		fs.mkdirSync(GENERATED_DIR, { recursive: true });
	}

	const outputPath = path.join(GENERATED_DIR, "playit.ts");
	const typesPath = path.join(GENERATED_DIR, "types.ts");
	const userPath = path.join(GENERATED_DIR, "user.ts");
	fs.writeFileSync(outputPath, content);
	fs.writeFileSync(typesPath, typesContent);
	fs.writeFileSync(userPath, userContent);
	console.log(`\n✓ Generated types at ${outputPath}`);
	console.log(`✓ Generated types file at ${typesPath}`);
	console.log(`✓ Generated user file at ${userPath}`);
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

