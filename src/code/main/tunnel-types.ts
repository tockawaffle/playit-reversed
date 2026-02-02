export type DefaultTunnelConfig = {
	defaultPort: number;
	portType: "tcp" | "udp" | "both";
	portCount: number;
};

export const tunnelTypes: Record<string, DefaultTunnelConfig> = {
	"minecraft-java": {
		defaultPort: 25565,
		portType: "tcp",
		portCount: 1,
	},
	"minecraft-bedrock": {
		defaultPort: 19132,
		portType: "udp",
		portCount: 1,
	},
	hytale: {
		defaultPort: 5520,
		portType: "udp",
		portCount: 1,
	},
	valheim: {
		defaultPort: 2456,
		portType: "udp",
		portCount: 1,
	},
	terraria: {
		defaultPort: 7777,
		portType: "tcp",
		portCount: 1,
	},
	"project-zomboid": {
		defaultPort: 11111,
		portType: "tcp",
		portCount: 1,
	},
	starbound: {
		defaultPort: 21025,
		portType: "udp",
		portCount: 1,
	},
	unturned: {
		defaultPort: 27015,
		portType: "tcp",
		portCount: 1,
	},
	rust: {
		defaultPort: 28015,
		portType: "tcp",
		portCount: 1,
	},
	"7days": {
		defaultPort: 26900,
		portType: "udp",
		portCount: 1,
	},
	"vintage-story": {
		defaultPort: 25000,
		portType: "tcp",
		portCount: 1,
	},
	"both": {
		defaultPort: 0,
		portType: "both",
		portCount: 0,
	},
	"tcp": {
		defaultPort: 0,
		portType: "tcp",
		portCount: 0,
	},
	"udp": {
		defaultPort: 0,
		portType: "udp",
		portCount: 0,
	},
}

export type TunnelTypeKey = keyof typeof tunnelTypes

// Const tuple for Zod enum type inference
export const tunnelTypeKeys = [
	"minecraft-java",
	"minecraft-bedrock",
	"hytale",
	"valheim",
	"terraria",
	"project-zomboid",
	"starbound",
	"unturned",
	"rust",
	"7days",
	"vintage-story",
	"both",
	"tcp",
	"udp",
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