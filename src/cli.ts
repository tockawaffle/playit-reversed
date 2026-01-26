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
import generateGenericCode from "./code/generic";
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
	const tunnelInstances = tunnels.map((t, i) => {
		// Generate alloc object based on status (discriminated union)
		let allocObject: string;
		if (t.alloc.status === "allocated") {
			allocObject = `{
            status: "allocated" as const,
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
        }`;
		} else if (t.alloc.status === "pending") {
			allocObject = `{
            status: "pending" as const,
        }`;
		} else {
			allocObject = `{
            status: "unallocated" as const,
        }`;
		}

		return `    ${tunnelKeys[i]}: {
        id: "${t.id}" as const,
        name: "${t.name}" as const,
        tunnelType: ${t.tunnelType ? `"${t.tunnelType}"` : "null"},
        portType: "${t.portType}" as const,
        portCount: ${t.portCount},
        alloc: ${allocObject},
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

	const content = generateGenericCode({
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
	});

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
