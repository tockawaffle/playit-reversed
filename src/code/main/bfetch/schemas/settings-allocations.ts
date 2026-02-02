import z from "zod";
import { tunnelTypeKeys } from "../../tunnel-types";

const allocationOutputSchema = z.object({
	future: z.object({
		v2_dev: z.boolean(),
		unstable_postcss: z.boolean(),
		unstable_tailwind: z.boolean(),
		v2_errorBoundary: z.boolean(),
		v2_headers: z.boolean(),
		v2_meta: z.boolean(),
		v2_normalizeFormMethod: z.boolean(),
		v2_routeConvention: z.boolean(),
	}),
	state: z.object({
		loaderData: z.object({
			"root": z.object({
				hostname: z.string(),
				protocol: z.string(),
				apiUrl: z.string(),
			}),
			"routes/account": z.object({
				tunnels: z.object({
					tunnels: z.array(
						z.object({
							id: z.string(),
							tunnel_type: z.enum(tunnelTypeKeys).nullable(),
							created_at: z.string(),
							name: z.string(),
							port_type: z.enum(["tcp", "udp", "both"]),
							port_count: z.number(),
							alloc: z.object({
								status: z.enum(
									["allocated", "pending", "disabled"]
								),
								data: z.object({
									id: z.string().optional(),
									ip_hostname: z.string().optional(),
									static_ip4: z.string().optional(),
									static_ip6: z.string().optional(),
									assigned_domain: z.string().optional(),
									assigned_srv: z.string().nullable().optional(),
									tunnel_ip: z.string().optional(),
									port_start: z.number().optional(),
									port_end: z.number().optional(),
									assignment: z.object({
										type: z.enum(["shared-ip", "shared-port"]).optional(),
									}).optional(),
									ip_type: z.enum(["ip4", "ip6", "both"]).optional(),
									region: z.string().optional(),
									reason: z.string().optional(),
								}).optional(),
							}).superRefine((alloc, ctx) => {
								if (alloc.status === "disabled") {
									// The only thing that the disabled state returns as data is the reason
									if (!alloc.data?.reason) {
										ctx.addIssue({
											code: "custom",
											message: "Disabled state must have a reason",
											path: ["data", "reason"],
										});
									}
								}
							}),
							origin: z.object({
								type: z.enum(["agent"]),
								data: z.object({
									agent_id: z.string(),
									agent_name: z.string(),
									local_ip: z.ipv4(),
									local_port: z.union([z.number().positive(), z.null()])
								}),
							}),
							domain: z.string().nullable(),
							firewall_id: z.string().nullable(),
							ratelimit: z.object({
								bytes_per_second: z.number().nullable(),
								packets_per_second: z.number().nullable(),
							}).nullable(),
							active: z.boolean(),
							disabled_reason: z.string().nullable(),
							region: z.string(),
							expire_notice: z.string().nullable(),
							proxy_protocol: z.string().nullable(),
							hostname_verify_level: z.enum(["None", "NoRawIp"]),
							agent_over_limit: z.boolean(),
						})
					),
					tcp_alloc: z.object({
						allowed: z.number().positive(),
						claimed: z.number().min(0),
						desired: z.number().min(0),
					}),
					udp_alloc: z.object({
						allowed: z.number().positive(),
						claimed: z.number().min(0),
						desired: z.number().min(0),
					}),
				}),
				agents: z.object({
					agents: z.array(
						z.object({
							id: z.string(),
							name: z.string(),
							created_at: z.string(),
							agent_version: z.object({
								variant_id: z.string(),
								schema_id: z.string(),
								name: z.string(),
								version: z.string(),
								platform: z.string(),
							}),
							self_managed: z.boolean(),
							status: z.object({
								state: z.enum(["connected", "offline"]),
								data: z.object({
									data_center_id: z.number().positive(),
									data_center_name: z.string(),
									client_addr: z.string(),
									tunnel_addr: z.string(),
									activity_latest_epoch_ms: z.number().positive(),
									activity_start_epoch_ms: z.number().positive(),
								}).optional(),
							}),
							routing: z.object({
								type: z.string(),
							}),
							routing_disabled_ip6: z.boolean(),
							sort_num: z.number().positive(),
						})
					)
				}),
				session: z.object({
					update_version: z.number().positive(),
					account_id: z.number().positive(),
					timestamp: z.number().positive(),
					account_status: z.string(),
					totp_status: z.unknown(),
					admin_id: z.number().positive().nullable(),
					admin_review_id: z.number().positive().nullable(),
					read_only: z.boolean(),
					show_admin: z.boolean(),
				}),
				firewalls: z.object({
					max_firewalls: z.number().positive(),
					max_rules: z.number().positive(),
					firewalls: z.array(z.unknown())
				}),
				overview: z.object({
					account_id: z.number().positive(),
					created_at: z.string(),
					account_status: z.string(),
					email: z.email(),
					email_change: z.string().nullable(),
					email_verified: z.boolean(),
					discord_connected: z.boolean(),
					totp_setup: z.string(),
					purchases_restricted: z.boolean(),
					has_premium: z.boolean(),
					month_usage_bytes: z.number().positive(),
					failed_invoice_id: z.number().positive().nullable(),
					delete_scheduled_at: z.string().nullable(),
					notice: z.string().nullable(),
					show_admin: z.boolean(),
					is_possesed: z.boolean(),
					in_review: z.boolean(),
				}),
				csrfToken: z.string(),
			}),
			"routes/account/settings/allocations": z.object({
				ports: z.array(z.unknown()),
				ips: z.array(z.object({
					ip_hostname: z.string(),
					sub_id: z.string().nullable(),
					region: z.string(),
					ip_type: z.string(),
					gre_target: z.string().nullable(),
				}).optional()),
			})
		}),
		"routes/account/settings": z.unknown().optional(),
		"routes/account/settings/allocations/index": z.unknown().optional(),
	}),
	actionData: z.unknown().optional(),
	errors: z.unknown().optional(),
})

export type AllocationOutputSchema = z.infer<typeof allocationOutputSchema>;

// Nested types extracted from the schema
export type AllocationOutputSchemaFuture = AllocationOutputSchema["future"];
export type AllocationOutputSchemaRoot = AllocationOutputSchema["state"]["loaderData"]["root"];
export type AllocationOutputSchemaRoutesAccount = AllocationOutputSchema["state"]["loaderData"]["routes/account"];
export type AllocationOutputSchemaSettingsAllocations = AllocationOutputSchema["state"]["loaderData"]["routes/account/settings/allocations"];

// Tunnel types
export type Tunnel = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["tunnels"]["tunnels"][number];
export type TunnelAlloc = Tunnel["alloc"];
export type TunnelAllocData = TunnelAlloc["data"];
export type TunnelAllocStatus = TunnelAlloc["status"];
export type TunnelAllocAssignment = NonNullable<NonNullable<TunnelAllocData>["assignment"]>;
export type TunnelOrigin = Tunnel["origin"];
export type TunnelOriginData = TunnelOrigin["data"];
export type TunnelRatelimit = Tunnel["ratelimit"];
export type TcpAlloc = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["tunnels"]["tcp_alloc"];
export type UdpAlloc = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["tunnels"]["udp_alloc"];

// Agent types
export type Agent = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["agents"]["agents"][number];
export type AgentVersion = Agent["agent_version"];
export type AgentStatus = Agent["status"];
export type AgentStatusData = AgentStatus["data"];
export type AgentRouting = Agent["routing"];

// Session types
export type Session = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["session"];

// Firewall types
export type Firewalls = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["firewalls"];

// Overview types
export type Overview = AllocationOutputSchema["state"]["loaderData"]["routes/account"]["overview"] & { csrfToken: string };

export type AccountData = {
	tunnels: Tunnel[];
	agents: Agent[];
	allocations: IpAllocation[];
	// Merge Session and Overview
	account: Overview;
	firewalls: Firewalls;
}

// IP allocation types
export type IpAllocation = NonNullable<AllocationOutputSchema["state"]["loaderData"]["routes/account/settings/allocations"]["ips"][number]>;

export {
	allocationOutputSchema
};

