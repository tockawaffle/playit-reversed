// Common types
export type UUID = string;
export type ISODateTime = string;
export type PortType = "tcp" | "udp" | "both";
export type IPType = "both" | "ipv4" | "ipv6";
export type HostnameVerifyLevel = "None" | "NoRawIp";
export type ProxyProtocol = "proxy-protocol-v2" | null;
export type TunnelType = "minecraft-java" | string | null;
export type AssignmentType = "shared-ip";
export type OriginType = "agent";
export type AgentState = "connected";
export type RoutingType = "Automatic";
export type AccountStatus = "verified";
export type TotpStatus = "signed" | "Setup";
export type Region = string;

// Allocation data types
export interface Assignment {
	type: AssignmentType;
}

export interface AllocationData {
	id: UUID;
	ip_hostname: string;
	static_ip4: string;
	static_ip6: string;
	assigned_domain: string;
	assigned_srv: string | null;
	tunnel_ip: string;
	port_start: number;
	port_end: number;
	assignment: Assignment;
	ip_type: IPType;
	region: Region;
}

export type Allocation =
	| {
		status: "allocated";
		data: AllocationData;
	}
	| {
		status: "pending";
	};

// Origin types
export interface AgentOriginData {
	agent_id: UUID;
	agent_name: string;
	local_ip: string;
	local_port: number | null;
}

export interface Origin {
	type: OriginType;
	data: AgentOriginData;
}

// Rate limit type
export interface RateLimit {
	bytes_per_second: number | null;
	packets_per_second: number | null;
}

// Tunnel type
export interface Tunnel {
	id: UUID;
	tunnel_type: TunnelType;
	created_at: ISODateTime;
	name: string;
	port_type: PortType;
	port_count: number;
	alloc: Allocation;
	origin: Origin;
	domain: string | null;
	firewall_id: UUID | null;
	ratelimit: RateLimit;
	active: boolean;
	disabled_reason: string | null;
	region: Region;
	expire_notice: string | null;
	proxy_protocol: ProxyProtocol;
	hostname_verify_level: HostnameVerifyLevel;
	agent_over_limit: boolean;
}

// Port allocation type
export interface PortAllocation {
	allowed: number;
	claimed: number;
	desired: number;
}

// Tunnels section type
export interface TunnelsSection {
	tunnels: Tunnel[];
	tcp_alloc: PortAllocation;
	udp_alloc: PortAllocation;
}

// Agent version type
export interface AgentVersion {
	variant_id: UUID;
	schema_id: UUID;
	name: string;
	version: string;
	platform: string;
}

// Agent status types
export interface AgentStatusData {
	data_center_id: number;
	data_center_name: string;
	client_addr: string;
	tunnel_addr: string;
	activity_latest_epoch_ms: number;
	activity_start_epoch_ms: number;
}

export interface AgentStatus {
	state: AgentState;
	data: AgentStatusData;
}

// Agent routing type
export interface AgentRouting {
	type: RoutingType;
}

// Agent type
export interface Agent {
	id: UUID;
	name: string;
	created_at: ISODateTime;
	agent_version: AgentVersion;
	self_managed: boolean;
	status: AgentStatus;
	routing: AgentRouting;
	routing_disabled_ip6: boolean;
	sort_num: number;
}

// Agents section type
export interface AgentsSection {
	agents: Agent[];
}

// TOTP status type
export interface TotpStatusData {
	status: TotpStatus;
	epoch_sec: number;
}

// Session type
export interface Session {
	update_version: number;
	account_id: number;
	timestamp: number;
	account_status: AccountStatus;
	totp_status: TotpStatusData;
	admin_id: UUID | null;
	admin_review_id: UUID | null;
	read_only: boolean;
	show_admin: boolean;
}

// Firewalls section type
export interface FirewallsSection {
	max_firewalls: number;
	max_rules: number;
	firewalls: unknown[];
}

// Overview type
export interface Overview {
	account_id: number;
	created_at: ISODateTime;
	account_status: AccountStatus;
	email: string;
	email_change: string | null;
	email_verified: boolean;
	discord_connected: boolean;
	totp_setup: TotpStatus;
	purchases_restricted: boolean;
	has_premium: boolean;
	month_usage_bytes: number;
	failed_invoice_id: UUID | null;
	delete_scheduled_at: ISODateTime | null;
	notice: string | null;
	show_admin: boolean;
	is_possesed: boolean;
	in_review: boolean;
}

// Root type
export interface PlayitResponse {
	tunnels: TunnelsSection;
	agents: AgentsSection;
	session: Session;
	firewalls: FirewallsSection;
	overview: Overview;
	csrfToken: string;
}
