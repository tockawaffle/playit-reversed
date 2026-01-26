import fs from "fs";
import path from "path";
import type { Agent, Allocation, Tunnel } from "../types";

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
	agents: Agent[];
	/** Generated tunnel instances code */
	tunnelInstances: string;
	/** Tunnel key identifiers */
	tunnelKeys: string[];
	/** Raw allocation data */
	allocations: Allocation[];
	/** Raw tunnel data */
	tunnels: Tunnel[];
	/** Function to convert names to identifiers */
	toIdentifier: (name: string) => string;
}

/**
 * Generate the header comment for the generated file
 */
function generateHeader(): string {
	return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated at: ${new Date().toISOString()}
 * 
 * Regenerate with: bun run playit:setup
 */

import { createFetch } from "@better-fetch/fetch";
import { spawn } from "child_process";
import type { AllocationData as AllocationDataResponse, PlayitResponse } from "../src/code/types";
`;
}

/**
 * Generate type definitions
 */
function generateTypes(config: CodegenConfig): string {
	return `// ============ Types ============

/** All available agent IDs */
export type AgentId = ${config.agentIds};

/** All available agent names */
export type AgentName = ${config.agentNames};

/** Agent identifier (property name) */
export type AgentKey = ${config.agentKeys};

/** All available tunnel IDs */
export type TunnelId = ${config.tunnelIds};

/** All available tunnel names */
export type TunnelName = ${config.tunnelNames};

/** Tunnel identifier (property name) */
export type TunnelKey = ${config.tunnelKeyTypes};

/** Allocation identifier (property name) */
export type AllocationKey = ${config.allocationKeyTypes};

/** Tunnel creation options */
export interface CreateTunnelOptions {
	description: string;
	localPort: number;
	localIp?: string;
	portType?: "tcp" | "udp" | "both";
	ipHostname?: AllocationKey;
	tunnelType: "dedicated-ip" | "shared-ip" | "shared-port";
	/** Be aware that this will not work at serverless or at similar environments. */
	regenerate?: boolean;
}

/** Tunnel update options */
export interface UpdateTunnelOptions {
    name?: string;
    localPort?: number;
    localIp?: string;
}
`;
}

/**
 * Generate tunnel data type definitions
 */
function generateTunnelDataTypes(): string {
	return `// ============ Tunnel Data ============

/** Tunnel allocation when status is "allocated" */
interface AllocatedTunnelAlloc {
    readonly status: "allocated";
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
}

/** Tunnel allocation when status is "pending" */
interface PendingTunnelAlloc {
    readonly status: "pending";
}

/** Tunnel allocation when status is "unallocated" */
interface UnallocatedTunnelAlloc {
    readonly status: "unallocated";
}

/** Tunnel allocation - discriminated union based on status */
type TunnelAlloc = AllocatedTunnelAlloc | PendingTunnelAlloc | UnallocatedTunnelAlloc;

/** Tunnel data structure */
interface TunnelData {
    readonly id: TunnelId;
    readonly name: TunnelName;
    readonly tunnelType: string | null;
    readonly portType: "tcp" | "udp" | "both";
    readonly portCount: number;
    readonly alloc: TunnelAlloc;
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
`;
}

/**
 * Generate agent data type definitions
 */
function generateAgentDataTypes(): string {
	return `// ============ Agent Data ============

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
    createStaticIpTunnel(options: CreateTunnelOptions): Promise<AllocationDataResponse>;
    /** Delete this agent */
    delete(): Promise<void>;
    /** Rename this agent */
    rename(newName: string): Promise<void>;
}
`;
}

/**
 * Generate action implementation functions
 */
function generateActionImplementations(): string {
	return `// ============ Action Implementations ============

/** 
 * TODO: These actions need to be implemented with actual API calls.
 * For now, they throw errors indicating they're not yet implemented.
 */

${getClass()}

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
`;
}

/**
 * Generate factory functions for creating refs
 */
function generateFactoryFunctions(): string {
	return `// ============ Factory Functions ============

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
		createStaticIpTunnel: (options) => PlayItClient.createStaticIpTunnel(data.id, options),
		delete: () => deleteAgent(data.id),
		rename: (newName) => renameAgent(data.id, newName),
	};
}
`;
}

/**
 * Generate tunnel instances and exports
 */
function generateTunnelInstances(config: CodegenConfig): string {
	return `// ============ Tunnel Instances ============

const _tunnelData = {
${config.tunnelInstances}
} as const;

/** All tunnels (with actions) */
export const tunnels: { [K in TunnelKey]: TunnelRef } = {
${config.tunnelKeys.map(key => `    ${key}: createTunnelRef(_tunnelData.${key} as TunnelData)`).join(",\n")}
};

/** Array of all tunnel IDs */
export const ALL_TUNNEL_IDS: TunnelId[] = [${config.tunnels.map(t => `"${t.id}"`).join(", ")}];

/** Array of all tunnel names */
export const ALL_TUNNEL_NAMES: TunnelName[] = [${config.tunnels.map(t => `"${t.name}"`).join(", ")}];
`;
}

/**
 * Generate agent instances and exports
 */
function generateAgentInstances(config: CodegenConfig): string {
	const agentDataEntries = config.agents.map(a => `    ${config.toIdentifier(a.name)}: {
        id: "${a.id}" as const,
        name: "${a.name}" as const,
        clientIp: "${a.clientIp}",
        tunnelIp: "${a.tunnelIp}",
        version: "${a.version}",
        os: "${a.os}" as const,
        status: "${a.status}" as const,
    }`).join(",\n");

	const agentRefEntries = config.agents.map(a => {
		const agentTunnelRefs = config.tunnels
			.map((t, i) => ({ tunnel: t, key: config.tunnelKeys[i] }))
			.filter(({ tunnel }) => tunnel.origin.agentId === a.id)
			.map(({ key }) => `tunnels.${key}`)
			.join(", ");
		return `    ${config.toIdentifier(a.name)}: createAgentRef(_agentData.${config.toIdentifier(a.name)} as AgentData, [${agentTunnelRefs}])`;
	}).join(",\n");

	return `// ============ Agent Instances ============

const _agentData = {
${agentDataEntries}
} as const;

/** All agents (with actions and their tunnels) */
export const agents: { [K in AgentKey]: AgentRef } = {
${agentRefEntries}
};

/** Map of agent names to IDs */
export const AGENT_IDS = {
${config.agents.map(a => `    "${a.name}": "${a.id}"`).join(",\n")}
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
${config.allocationInstances}
};

/** Array of all allocation hostnames */
export const ALL_ALLOCATION_HOSTNAMES: string[] = [${config.allocations.map(a => `"${a.ipHostname}"`).join(", ")}];
`;
}

/**
 * Generate regenerate function
 */
function generateRegenerateFunction(): string {
	return `// ============ Regenerate ============

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
`;
}

/**
 * Generate the main playit export object
 */
function generatePlayitExport(config: CodegenConfig): string {
	const firstAgentName = config.agents[0]?.name || "my_agent";
	const firstAgentId = config.agents[0]?.id || "...";
	const firstAgentStatus = config.agents[0]?.status || "...";
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
}

/**
 * Get the PlayItClient class from index.ts (excluding IGNORE sections)
 */
function getClass(): string {
	const indexContent = fs.readFileSync(path.join(__dirname, "index.ts"), "utf-8");
	// Remove everything between /** IGNORE_START */ and /** IGNORE_END */ (including the tags)
	const indexContentWithoutIgnore = indexContent.replace(/\/\*\* IGNORE_START \*\/[\s\S]*?\/\*\* IGNORE_END \*\//g, "");
	return indexContentWithoutIgnore;
}

/**
 * Generate the complete TypeScript code from the configuration
 */
export default function generateGenericCode(config: CodegenConfig): string {
	const sections = [
		generateHeader(),
		generateTypes(config),
		generateTunnelDataTypes(),
		generateAgentDataTypes(),
		generateActionImplementations(),
		generateFactoryFunctions(),
		generateTunnelInstances(config),
		generateAgentInstances(config),
		generateAllocationInstances(config),
		generateRegenerateFunction(),
		generatePlayitExport(config),
	];

	return sections.join("\n");
}
