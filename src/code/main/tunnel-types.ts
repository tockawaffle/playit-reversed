export type DefaultTunnelConfig = {
	defaultPort: number;
	portType: "tcp" | "udp" | "both";
	portCount: number;
	formatedName: string;
	requirePremium: boolean;
};

export const tunnelTypes = {
	"minecraft-java": {
		defaultPort: 25565,
		portType: "tcp",
		portCount: 1,
		formatedName: "Minecraft Java",
		requirePremium: false,
	},
	"minecraft-bedrock": {
		defaultPort: 19132,
		portType: "udp",
		portCount: 1,
		formatedName: "Minecraft Bedrock",
		requirePremium: false,
	},
	terraria: {
		defaultPort: 7777,
		portType: "tcp",
		portCount: 1,
		formatedName: "Terraria",
		requirePremium: false,
	},
	valheim: {
		defaultPort: 2456,
		portType: "udp",
		portCount: 1,
		formatedName: "Valheim",
		requirePremium: false,
	},
	starbound: {
		defaultPort: 21025,
		portType: "udp",
		portCount: 1,
		formatedName: "Starbound",
		requirePremium: true,
	},
	rust: {
		defaultPort: 28015,
		portType: "tcp",
		portCount: 1,
		formatedName: "Rust",
		requirePremium: false,
	},
	"7days": {
		defaultPort: 26900,
		portType: "udp",
		portCount: 1,
		formatedName: "7 Days",
		requirePremium: false,
	},
	unturned: {
		defaultPort: 27015,
		portType: "tcp",
		portCount: 1,
		formatedName: "Unturned",
		requirePremium: true,
	},
	hytale: {
		defaultPort: 5520,
		portType: "udp",
		portCount: 1,
		formatedName: "Hytale",
		requirePremium: false,
	},
	"project-zomboid": {
		defaultPort: 16261,
		portType: "tcp",
		portCount: 1,
		formatedName: "Project Zomboid",
		requirePremium: true,
	},
	"vintage-story": {
		defaultPort: 42420,
		portType: "tcp",
		portCount: 1,
		formatedName: "Vintage Story",
		requirePremium: true,
	},
	https: {
		defaultPort: 0,
		portType: "tcp",
		portCount: 0,
		formatedName: "HTTPs",
		requirePremium: true,
	},
	tcp: {
		defaultPort: 0,
		portType: "tcp",
		portCount: 0,
		formatedName: "TCP",
		requirePremium: true,
	},
	udp: {
		defaultPort: 0,
		portType: "udp",
		portCount: 0,
		formatedName: "UDP",
		requirePremium: false,
	},
	both: {
		defaultPort: 0,
		portType: "both",
		portCount: 0,
		formatedName: "TCP+UDP",
		requirePremium: true,
	},
} as const satisfies Record<string, DefaultTunnelConfig>

/**
 * All available tunnel type keys
 */
export type TunnelTypeKey = keyof typeof tunnelTypes

/**
 * Port type union
 */
export type PortType = "tcp" | "udp" | "both"

/**
 * Free tunnel types (no premium required)
 */
export type FreeTunnelType =
	| "minecraft-java"
	| "minecraft-bedrock"
	| "terraria"
	| "valheim"
	| "rust"
	| "7days"
	| "hytale"
	| "udp"

/**
 * Premium tunnel types (premium required)
 */
export type PremiumTunnelType =
	| "starbound"
	| "unturned"
	| "project-zomboid"
	| "vintage-story"
	| "https"
	| "tcp"
	| "both"

/**
 * Game-specific tunnel types
 */
export type GameTunnelType =
	| "minecraft-java"
	| "minecraft-bedrock"
	| "terraria"
	| "valheim"
	| "starbound"
	| "rust"
	| "7days"
	| "unturned"
	| "hytale"
	| "project-zomboid"
	| "vintage-story"

/**
 * Protocol tunnel types (TCP, UDP, HTTPS, etc.)
 */
export type ProtocolTunnelType = "https" | "tcp" | "udp" | "both"

/**
 * TCP-based tunnel types
 */
export type TcpTunnelType = Extract<TunnelTypeKey,
	"minecraft-java" | "terraria" | "rust" | "unturned" | "project-zomboid" | "vintage-story" | "https" | "tcp"
>

/**
 * UDP-based tunnel types
 */
export type UdpTunnelType = Extract<TunnelTypeKey,
	"minecraft-bedrock" | "valheim" | "starbound" | "7days" | "hytale" | "udp"
>

/**
 * Type guard to check if a tunnel type is premium
 */
export function isPremiumTunnelType(tunnelType: TunnelTypeKey): tunnelType is PremiumTunnelType {
	return tunnelTypes[tunnelType].requirePremium
}

/**
 * Type guard to check if a tunnel type is free
 */
export function isFreeTunnelType(tunnelType: TunnelTypeKey): tunnelType is FreeTunnelType {
	return !tunnelTypes[tunnelType].requirePremium
}

/**
 * Type guard to check if a tunnel type is game-specific
 */
export function isGameTunnelType(tunnelType: TunnelTypeKey): tunnelType is GameTunnelType {
	const protocolTypes: ProtocolTunnelType[] = ["https", "tcp", "udp", "both"]
	return !protocolTypes.includes(tunnelType as ProtocolTunnelType)
}

/**
 * Type guard to check if a tunnel type is protocol-based
 */
export function isProtocolTunnelType(tunnelType: TunnelTypeKey): tunnelType is ProtocolTunnelType {
	const protocolTypes: ProtocolTunnelType[] = ["https", "tcp", "udp", "both"]
	return protocolTypes.includes(tunnelType as ProtocolTunnelType)
}

// Const tuple for Zod enum type inference
export const tunnelTypeKeys = [
	"minecraft-java",
	"minecraft-bedrock",
	"terraria",
	"valheim",
	"starbound",
	"rust",
	"7days",
	"unturned",
	"hytale",
	"project-zomboid",
	"vintage-story",
	"https",
	"tcp",
	"udp",
	"both",
] as const satisfies readonly TunnelTypeKey[]

/**
 * Complete tunnel configuration with all required fields.
 */
export type TunnelConfig = {
	port: number;
	portType: "tcp" | "udp" | "both";
	portCount: number;
};

/**
 * Get the default configuration for a tunnel type.
 * @param tunnelType - The tunnel type key
 * @returns The default configuration for the tunnel type
 */
export function getTunnelTypeConfig(tunnelType: TunnelTypeKey): DefaultTunnelConfig | undefined {
	const config = tunnelTypes[tunnelType];
	if (!config) return undefined;
	return config;
}

/**
 * Get all available tunnel type keys.
 */
export function getAllTunnelTypes(): TunnelTypeKey[] {
	return Object.keys(tunnelTypes) as TunnelTypeKey[];
}

/**
 * Check if a tunnel type exists.
 * @param tunnelType - The tunnel type key to check
 * @returns true if the tunnel type exists
 */
export function isValidTunnelType(tunnelType: string): tunnelType is TunnelTypeKey {
	return tunnelType in tunnelTypes;
}

/**
 * Get all free tunnel types.
 * @returns Array of free tunnel type keys
 */
export function getFreeTunnelTypes(): FreeTunnelType[] {
	return tunnelTypeKeys.filter(isFreeTunnelType) as FreeTunnelType[]
}

/**
 * Get all premium tunnel types.
 * @returns Array of premium tunnel type keys
 */
export function getPremiumTunnelTypes(): PremiumTunnelType[] {
	return tunnelTypeKeys.filter(isPremiumTunnelType) as PremiumTunnelType[]
}

/**
 * Get all game-specific tunnel types.
 * @returns Array of game tunnel type keys
 */
export function getGameTunnelTypes(): GameTunnelType[] {
	return tunnelTypeKeys.filter(isGameTunnelType) as GameTunnelType[]
}

/**
 * Get all protocol tunnel types.
 * @returns Array of protocol tunnel type keys
 */
export function getProtocolTunnelTypes(): ProtocolTunnelType[] {
	return tunnelTypeKeys.filter(isProtocolTunnelType) as ProtocolTunnelType[]
}

/**
 * Get tunnel types by port type.
 * @param portType - The port type to filter by
 * @returns Array of tunnel type keys that use the specified port type
 */
export function getTunnelTypesByPortType(portType: PortType): TunnelTypeKey[] {
	return tunnelTypeKeys.filter(key => tunnelTypes[key].portType === portType)
}

/**
 * Get the formatted name for a tunnel type.
 * @param tunnelType - The tunnel type key
 * @returns The formatted display name
 */
export function getTunnelTypeName(tunnelType: TunnelTypeKey): string {
	return tunnelTypes[tunnelType].formatedName
}

/**
 * Check if a tunnel type has a default port configured.
 * @param tunnelType - The tunnel type key
 * @returns true if the tunnel type has a non-zero default port
 */
export function hasDefaultPort(tunnelType: TunnelTypeKey): boolean {
	return tunnelTypes[tunnelType].defaultPort > 0
}