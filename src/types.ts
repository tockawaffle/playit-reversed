// ============ Entity Types ============

export interface Agent {
	id: string;
	name: string;
	clientIp: string;
	tunnelIp: string;
	version: string;
	os: string;
	status: string;
}

export interface TunnelAlloc {
	status: string;
	id: string;
	ipHostname: string;
	staticIp4: string;
	staticIp6: string;
	assignedDomain: string;
	assignedSrv: string | null;
	tunnelIp: string;
	portStart: number;
	portEnd: number;
	ipType: string;
	region: string;
}

export interface TunnelOrigin {
	agentId: string;
	agentName: string;
	localIp: string;
	localPort: number;
}

export interface Tunnel {
	id: string;
	name: string;
	tunnelType: string | null;
	portType: string;
	portCount: number;
	alloc: TunnelAlloc;
	origin: TunnelOrigin;
	domain: string | null;
	active: boolean;
	region: string;
	proxyProtocol: string | null;
}

export interface Allocation {
	ipHostname: string;
	subId: string | null;
	region: string;
	ipType: string;
	greTarget: string | null;
}

// ============ Client Options ============

export interface PlayItOptions {
	/** Your playit.gg session token */
	authorizationToken?: string;
	/** Base URL for the API (default: https://playit.gg) */
	baseUrl?: string;
}

// ============ Fetched Data ============

export interface PlayItData {
	agents: Agent[];
	tunnels: Tunnel[];
	allocations: Allocation[];
}
