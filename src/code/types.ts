import z from "zod";

// Common schemas
const UUID = z.string();
const ISODateTime = z.string();
const PortType = z.enum(["tcp", "udp", "both"]);
const IPType = z.enum(["both", "ipv4", "ipv6"]);
const HostnameVerifyLevel = z.enum(["None", "NoRawIp"]);
const ProxyProtocol = z.enum(["proxy-protocol-v2"]).nullable();
const TunnelType = z.enum(["minecraft-java"]).nullable();
const AssignmentType = z.enum(["shared-ip"]);
const OriginType = z.enum(["agent"]);
const AgentState = z.enum(["connected"]);
const RoutingType = z.enum(["Automatic"]);
const AccountStatus = z.enum(["verified"]);
const TotpStatus = z.enum(["signed", "Setup"]);
const Region = z.string();

// Allocation data schemas
const AssignmentSchema = z.object({
	type: AssignmentType,
});

const AllocationDataSchema = z.object({
	id: UUID,
	ip_hostname: z.string(),
	static_ip4: z.string(),
	static_ip6: z.string(),
	assigned_domain: z.string(),
	assigned_srv: z.string().nullable(),
	tunnel_ip: z.string(),
	port_start: z.number(),
	port_end: z.number(),
	assignment: AssignmentSchema,
	ip_type: IPType,
	region: Region,
});

const AllocationSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("allocated"),
		data: AllocationDataSchema,
	}),
	z.object({
		status: z.literal("pending"),
	}),
]);

// Origin schemas
const AgentOriginDataSchema = z.object({
	agent_id: UUID,
	agent_name: z.string(),
	local_ip: z.string(),
	local_port: z.number().nullable(),
});

const OriginSchema = z.object({
	type: OriginType,
	data: AgentOriginDataSchema,
});

// Rate limit schema
const RateLimitSchema = z.object({
	bytes_per_second: z.number().nullable(),
	packets_per_second: z.number().nullable(),
});

// Tunnel schema
const TunnelSchema = z.object({
	id: UUID,
	tunnel_type: TunnelType,
	created_at: ISODateTime,
	name: z.string(),
	port_type: PortType,
	port_count: z.number(),
	alloc: AllocationSchema,
	origin: OriginSchema,
	domain: z.string().nullable(),
	firewall_id: UUID.nullable(),
	ratelimit: RateLimitSchema,
	active: z.boolean(),
	disabled_reason: z.string().nullable(),
	region: Region,
	expire_notice: z.string().nullable(),
	proxy_protocol: ProxyProtocol,
	hostname_verify_level: HostnameVerifyLevel,
	agent_over_limit: z.boolean(),
});

// Port allocation schema
const PortAllocationSchema = z.object({
	allowed: z.number(),
	claimed: z.number(),
	desired: z.number(),
});

// Tunnels section schema
const TunnelsSectionSchema = z.object({
	tunnels: z.array(TunnelSchema),
	tcp_alloc: PortAllocationSchema,
	udp_alloc: PortAllocationSchema,
});

// Agent version schema
const AgentVersionSchema = z.object({
	variant_id: UUID,
	schema_id: UUID,
	name: z.string(),
	version: z.string(),
	platform: z.string(),
});

// Agent status schemas
const AgentStatusDataSchema = z.object({
	data_center_id: z.number(),
	data_center_name: z.string(),
	client_addr: z.string(),
	tunnel_addr: z.string(),
	activity_latest_epoch_ms: z.number(),
	activity_start_epoch_ms: z.number(),
});

const AgentStatusSchema = z.object({
	state: AgentState,
	data: AgentStatusDataSchema,
});

// Agent routing schema
const AgentRoutingSchema = z.object({
	type: RoutingType,
});

// Agent schema
const AgentSchema = z.object({
	id: UUID,
	name: z.string(),
	created_at: ISODateTime,
	agent_version: AgentVersionSchema,
	self_managed: z.boolean(),
	status: AgentStatusSchema,
	routing: AgentRoutingSchema,
	routing_disabled_ip6: z.boolean(),
	sort_num: z.number(),
});

// Agents section schema
const AgentsSectionSchema = z.object({
	agents: z.array(AgentSchema),
});

// TOTP status schema
const TotpStatusDataSchema = z.object({
	status: TotpStatus,
	epoch_sec: z.number(),
});

// Session schema
const SessionSchema = z.object({
	update_version: z.number(),
	account_id: z.number(),
	timestamp: z.number(),
	account_status: AccountStatus,
	totp_status: TotpStatusDataSchema,
	admin_id: UUID.nullable(),
	admin_review_id: UUID.nullable(),
	read_only: z.boolean(),
	show_admin: z.boolean(),
});

// Firewalls section schema
const FirewallsSectionSchema = z.object({
	max_firewalls: z.number(),
	max_rules: z.number(),
	firewalls: z.array(z.unknown()),
});

// Overview schema
const OverviewSchema = z.object({
	account_id: z.number(),
	created_at: ISODateTime,
	account_status: AccountStatus,
	email: z.string(),
	email_change: z.string().nullable(),
	email_verified: z.boolean(),
	discord_connected: z.boolean(),
	totp_setup: TotpStatus,
	purchases_restricted: z.boolean(),
	has_premium: z.boolean(),
	month_usage_bytes: z.number(),
	failed_invoice_id: UUID.nullable(),
	delete_scheduled_at: ISODateTime.nullable(),
	notice: z.string().nullable(),
	show_admin: z.boolean(),
	is_possesed: z.boolean(),
	in_review: z.boolean(),
});

// Root schema
export const PlayitResponseSchema = z.object({
	tunnels: TunnelsSectionSchema,
	agents: AgentsSectionSchema,
	session: SessionSchema,
	firewalls: FirewallsSectionSchema,
	overview: OverviewSchema,
	csrfToken: z.string(),
});

// Derived TypeScript types
export type UUID = z.infer<typeof UUID>;
export type ISODateTime = z.infer<typeof ISODateTime>;
export type PortType = z.infer<typeof PortType>;
export type IPType = z.infer<typeof IPType>;
export type HostnameVerifyLevel = z.infer<typeof HostnameVerifyLevel>;
export type ProxyProtocol = z.infer<typeof ProxyProtocol>;
export type TunnelType = z.infer<typeof TunnelType>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type AllocationData = z.infer<typeof AllocationDataSchema>;
export type Allocation = z.infer<typeof AllocationSchema>;
export type AgentOriginData = z.infer<typeof AgentOriginDataSchema>;
export type Origin = z.infer<typeof OriginSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
export type Tunnel = z.infer<typeof TunnelSchema>;
export type PortAllocation = z.infer<typeof PortAllocationSchema>;
export type TunnelsSection = z.infer<typeof TunnelsSectionSchema>;
export type AgentVersion = z.infer<typeof AgentVersionSchema>;
export type AgentStatusData = z.infer<typeof AgentStatusDataSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentRouting = z.infer<typeof AgentRoutingSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type AgentsSection = z.infer<typeof AgentsSectionSchema>;
export type TotpStatusData = z.infer<typeof TotpStatusDataSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type FirewallsSection = z.infer<typeof FirewallsSectionSchema>;
export type Overview = z.infer<typeof OverviewSchema>;
export type PlayitResponse = z.infer<typeof PlayitResponseSchema>;
