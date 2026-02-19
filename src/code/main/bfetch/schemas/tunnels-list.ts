import { z } from "zod";
import { tunnelTypeKeys, type GameTunnelType } from "../../tunnel-types";

const tunnelsListOutputSchema = z.object({
	status: z.string(),
	data: z.object({
		tunnels: z.array(
			z.object({
				id: z.uuidv4(),
				created_at: z.string(),
				name: z.string(),
				user_enabled: z.boolean(),
				offline_reasons: z.array(z.string()).nullable(),
				tunnel_type: z.enum(tunnelTypeKeys.filter(key =>
					!["https", "tcp", "udp", "both"].includes(key)
				) as [GameTunnelType, ...GameTunnelType[]]).nullable(),
				port_type: z.enum(["tcp", "udp", "both"]),
				port_count: z.number().positive(),
				firewall_id: z.unknown().nullable(),
				props: z.object({
					hostname_verify_level: z.enum(["None", "NoRawIp"]),
				}),
				origin: z.object({
					type: z.enum(["agent"]),
					details: z.object({
						agent_id: z.uuidv4(),
						name: z.string(),
						config_schema_id: z.uuidv4(),
						config_data: z.object({
							fields: z.array(
								z.object({
									name: z.string(),
									value: z.string(),
								})
							)
						}),
						config_invalid: z.unknown().nullable(),
					})
				}),
				port_allocation_requests: z.array(
					z.object({
						id: z.uuidv4(),
						status: z.string(),
						region: z.string(),
						public_port: z.number().positive().nullable(),
						public_ip: z.string().nullable(),
					})
				),
				public_allocations: z.array(
					z.discriminatedUnion("type", [
						z.object({
							type: z.literal("PortAllocation"),
							details: z.object({
								alloc_id: z.uuidv4(),
								ip_region: z.string(),
								ip_hostname: z.string(),
								auto_domain: z.string(),
								ip: z.string(),
								port: z.number().positive(),
								port_count: z.number().positive(),
								port_type: z.enum(["tcp", "udp", "both"]),
								expire_notice: z.unknown().nullable(),
							})
						}),
						z.object({
							type: z.literal("Gateway"),
							details: z.object({
								id: z.unknown().nullable(),
								hostname: z.string(),
								region: z.string(),
							})
						})
					])
				),
				connect_addresses: z.array(
					z.object({
						type: z.enum(["auto", "addr4", "addr6", "ip4", "ip6"]),
						value: z.object({
							address: z.string(),
							default_port: z.number().positive().optional(),
							source: z.object({
								resource: z.enum(["port-allocation"]),
								id: z.uuidv4(),
							})
						})
					})
				)
			})
		)
	})
})

export {
	tunnelsListOutputSchema
};

