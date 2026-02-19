import type z from "zod";

import type { accountOverviewOutputSchema, agentsListOutputSchema, allocationsListOutputSchema, tunnelsListOutputSchema } from "./main/bfetch/schemas";

import {
	getActionsImport,
	getFactoryTemplate,
	getHeaderImports,
	getRegenerateTemplate,
	getTypesTemplate,
} from "./templates/index";

/**
 * Configuration for code generation
 */
export interface CodegenConfig {
	/** All agent IDs as a union type string */
	agentIds: string;
	/** All agent names as a union type string */
	agentNames: string;
	/** All agent keys as a union type string */
	agentKeys: string;
	/** All tunnel IDs as a union type string */
	tunnelIds: string;
	/** All tunnel names as a union type string */
	tunnelNames: string;
	/** All tunnel keys as a union type string */
	tunnelKeyTypes: string;
	/** All allocation keys as a union type string */
	allocationKeyTypes: string;
	/** Generated allocation instances code */
	allocationInstances: string;
	/** Raw agent data */
	agents: z.infer<typeof agentsListOutputSchema>["data"]["agents"];
	/** Generated tunnel instances code */
	tunnelInstances: string;
	/** Tunnel key identifiers */
	tunnelKeys: string[];
	/** Raw allocation data */
	allocations: z.infer<typeof allocationsListOutputSchema>["data"]["ips"];
	/** Raw tunnel data */
	tunnels: z.infer<typeof tunnelsListOutputSchema>["data"]["tunnels"];
	/** Raw user data */
	user: z.infer<typeof accountOverviewOutputSchema>["data"];
	/** Function to convert names to identifiers */
	toIdentifier: (name: string) => string;
}

/**
 * Generate the types file with codegen-specific types
 * Uses the template from templates/types.ts for type-checked definitions
 */
export function generateTypesFile(config: CodegenConfig): string {
	// Get the type-checked template content
	const templateTypes = getTypesTemplate();

	return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated at: ${new Date().toISOString()}
 * 
 * Regenerate with: bun run playit:setup
 */

// ============ Codegen Types ============

/** All available agent IDs */
export type AgentId = ${config.agentIds} | string;

/** All available agent names */
export type AgentName = ${config.agentNames} | string;

/** Agent identifier (property name) */
export type AgentKey = ${config.agentKeys} | string;

/** All available tunnel IDs */
export type TunnelId = ${config.tunnelIds} | string;

/** All available tunnel names */
export type TunnelName = ${config.tunnelNames} | string;

/** Tunnel identifier (property name) */
export type TunnelKey = ${config.tunnelKeyTypes} | string;

/** Allocation identifier (property name) */
export type AllocationKey = ${config.allocationKeyTypes} | string;

${templateTypes}
`;
}

/**
 * Generate the header comment and imports for the generated file
 */
function generateHeader(): string {
	return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated at: ${new Date().toISOString()}
 * 
 * Regenerate with: bun run playit:setup
 */

${getHeaderImports()}
`;
}

/**
 * Generate action imports
 * Actions are implemented in src/code/actions.ts and imported here
 */
function generateActionImports(): string {
	return `// ============ Action Imports ============
// Actions are implemented in src/code/actions.ts for proper type checking

${getActionsImport()}
`;
}

/**
 * Generate factory functions for creating refs
 * Uses the template from templates/factory.ts for type-checked implementations
 */
function generateFactoryFunctions(): string {
	return getFactoryTemplate();
}

/**
 * Generate tunnel instances and exports
 */
function generateTunnelInstances(config: CodegenConfig): string {
	return `// ============ Tunnel Instances ============

const _tunnelData = {
${config.tunnelInstances}
} as const;

/** All tunnels (with actions) - typed as Record for index signature compatibility */
export const tunnels = {
${config.tunnelKeys.map(key => `	${key}: createTunnelRef(_tunnelData.${key} as unknown as TunnelData)`).join(",\n")}
} satisfies Record<TunnelKey, TunnelRef>;

/** Array of all tunnel IDs */
export const ALL_TUNNEL_IDS: TunnelId[] = [${config.tunnels.map(t => `"${t.id}"`).join(", ")}];

/** Array of all tunnel names */
export const ALL_TUNNEL_NAMES: TunnelName[] = [${config.tunnels.map(t => `"${t.name}"`).join(", ")}];
`;
}

/**
 * Generate agent instances and exports
 * Generates complete AgentData structure matching the schema
 */
function generateAgentInstances(config: CodegenConfig): string {
	const agentDataEntries = config.agents.map(a => {
		const statusData = a.status.data;
		const hasStatusData = statusData != null;

		const statusDataStr = hasStatusData
			? `		data: {
			data_center_id: ${statusData.data_center_id},
			data_center_name: "${statusData.data_center_name}",
			client_addr: "${statusData.client_addr}",
			tunnel_addr: "${statusData.tunnel_addr}",
			activity_latest_epoch_ms: ${statusData.activity_latest_epoch_ms},
			activity_start_epoch_ms: ${statusData.activity_start_epoch_ms}
		}`
			: `		data: null`;

		return `	${config.toIdentifier(a.name)}: {
		id: "${a.id}" as const,
		name: "${a.name}" as const,
		created_at: "${a.created_at}",
		agent_version: {
			variant_id: "${a.agent_version.variant_id}",
			schema_id: "${a.agent_version.schema_id}",
			name: "${a.agent_version.name}",
			version: "${a.agent_version.version}",
			platform: "${a.agent_version.platform}"
		},
		self_managed: ${a.self_managed},
		status: {
			state: "${a.status.state}" as const,
${statusDataStr}
		},
		routing: {
			type: "${a.routing.type}",
			details: "${a.routing.details}"
		},
		routing_disabled_ip6: ${a.routing_disabled_ip6},
		sort_num: ${a.sort_num}
	}`;
	}).join(",\n");

	const agentRefEntries = config.agents.map(a => {
		const agentTunnelRefs = config.tunnels
			.map((t, i) => ({ tunnel: t, key: config.tunnelKeys[i] }))
			.filter(({ tunnel }) => tunnel.origin.details.agent_id === a.id)
			.map(({ key }) => `tunnels["${key}"]`)
			.join(", ");
		return `	${config.toIdentifier(a.name)}: createAgentRef(_agentData.${config.toIdentifier(a.name)}, [${agentTunnelRefs}])`;
	}).join(",\n");

	return `// ============ Agent Instances ============

const _agentData = {
${agentDataEntries}
} as const;

/** All agents (with actions and their tunnels) - typed as Record for index signature compatibility */
export const agents = {
${agentRefEntries}
} satisfies Record<AgentKey, AgentRef>;

/** Map of agent names to IDs */
export const AGENT_IDS = {
${config.agents.map(a => `	"${a.name}": "${a.id}"`).join(",\n")}
} as const;

/** Array of all agent IDs */
export const ALL_AGENT_IDS: AgentId[] = [${config.agents.map(a => `"${a.id}"`).join(", ")}];

/** Array of all agent names */
export const ALL_AGENT_NAMES: AgentName[] = [${config.agents.map(a => `"${a.name}"`).join(", ")}];
`;
}

/**
 * Generate allocation instances and exports
 */
function generateAllocationInstances(config: CodegenConfig): string {
	return `// ============ Allocations ============

/** All IP allocations - typed as Record for index signature compatibility */
export const allocations = {
${config.allocationInstances}
} satisfies Record<AllocationKey, AllocationData>;

/** Array of all allocation hostnames */
export const ALL_ALLOCATION_HOSTNAMES: string[] = [${config.allocations.map(a => `"${a.ip_hostname}"`).join(", ")}];
`;
}

/**
 * Generate regenerate function
 * Uses the template from templates/regenerate.ts for type-checked implementation
 */
function generateRegenerateFunction(): string {
	return getRegenerateTemplate();
}

/**
 * Generate the main playit export object
 */
function generatePlayitExport(config: CodegenConfig): string {
	const firstAgentName = config.agents[0]?.name || "my_agent";
	const firstAgentId = config.agents[0]?.id || "...";
	const firstAgentStatus = config.agents[0]?.status?.state || "...";
	const firstTunnelKey = config.tunnelKeys[0] || "my_tunnel";

	return `// ============ PlayIt API ============

/**
 * The PlayIt API
 * 
 * @example
 * \`\`\`ts
 * import { playit } from "./generated/playit";
 * 
 * // Access agents (with their tunnels)
 * const agent = playit.agents.${config.toIdentifier(firstAgentName)};
 * console.log(agent.id);       // "${firstAgentId}"
 * console.log(agent.status);   // "${firstAgentStatus}"
 * console.log(agent.tunnels);  // All tunnels for this agent
 * 
 * // Agent actions
 * await agent.createTunnel({ name: "SSH", localPort: 22, portType: "tcp" });
 * await agent.rename("new-name");
 * await agent.delete();
 * 
 * // Access tunnels directly
 * const tunnel = playit.tunnels.${firstTunnelKey};
 * console.log(tunnel.alloc.assignedDomain);
 * console.log(tunnel.origin.localPort);
 * 
 * // Tunnel actions
 * await tunnel.update({ name: "New Name", localPort: 8080 });
 * await tunnel.disable();
 * await tunnel.enable();
 * await tunnel.delete();
 * 
 * // Operate on tunnels/agents by ID (e.g. newly created, not in codegen)
 * await playit.tunnel("some-tunnel-id").delete();
 * await playit.agent("some-agent-id").rename("new-name");
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
	
	/** Get a tunnel ref by ID (for tunnels not in codegen, e.g. newly created) */
	tunnel: (id: TunnelId) => createTunnelRefById(id),
	
	/** Get an agent ref by ID (for agents not in codegen, e.g. newly created) */
	agent: (id: AgentId) => createAgentRefById(id),
	
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

	/** Get all tunnels */
	getTunnels: GetTunnels,

	/** Get a tunnel by its MAIN ID */
	getTunnel: GetTunnel,
};

export default playit;
`;
}

/**
 * Generate the user file with codegen-specific types
 */
export function generateUserFile(config: CodegenConfig): string {
	const lines = Object.entries(config.user).map(([key, value]) => {
		const formatted =
			value === null
				? "null"
				: typeof value === "number" || typeof value === "boolean"
					? String(value)
					: JSON.stringify(value);
		return `\t"${key}": ${formatted}`;
	});
	return `// ============ User File ============
import type { AccountData } from "playit-reversed";
export const user = {
${lines.join(",\n")}
} satisfies AccountData["account"];
`;
}

/**
 * Generate the complete TypeScript code from the configuration
 */
export default function generateGenericCode(config: CodegenConfig): string {
	const sections = [
		generateHeader(),
		generateActionImports(),
		generateFactoryFunctions(),
		generateTunnelInstances(config),
		generateAgentInstances(config),
		generateAllocationInstances(config),
		generateRegenerateFunction(),
		generatePlayitExport(config),
	];

	return sections.join("\n");
}
