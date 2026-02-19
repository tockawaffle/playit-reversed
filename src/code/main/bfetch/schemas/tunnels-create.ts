import z from "zod";
import { premiumRegionsMap } from "../../regions";
import { tunnelTypeKeys, type GameTunnelType } from "../../tunnel-types";

const tunnelsCreateInputSchema = z.object({
	name: z.string(),
	protocol: z.discriminatedUnion("type", [
		z.object({
			type: z.literal("raw-ports"),
			details: z.object({
				port_type: z.enum(["tcp", "udp", "both"]),
				port_count: z.number().positive(),
				software_description: z.string(),
			}),
		}),
		z.object({
			type: z.literal("tunnel-type"),
			details: z.enum(tunnelTypeKeys.filter(key =>
				!["https", "tcp", "udp", "both"].includes(key)
			) as [GameTunnelType, ...GameTunnelType[]]),
		}),
	]),
	origin: z.object({
		type: z.enum(["agent"]),
		data: z.object({
			agent_id: z.uuidv4(),
			config: z.object({
				fields: z.array(z.object({
					name: z.enum(["local_ip", "local_port"]),
					value: z.union([z.string(), z.number()]),
				})),
			}),
		}),
	}),
	endpoint: z.discriminatedUnion("type", [
		z.object({
			type: z.literal("dedicated-ip"),
			details: z.object({
				ip_hostname: z.string(),
				port: z.number().positive().max(65535).nullable(),
			}),
		}),
		z.object({
			type: z.literal("region"),
			details: z.object({
				region: z.enum([
					"global",
					...Array.from(premiumRegionsMap.keys()),
				]),
				port: z.number().positive().max(65535).nullable(),
			}),
		}),
	]),
	enabled: z.boolean(),
})

const tunnelsCreateOutputSchema = z.object({
	status: z.literal("success"),
	data: z.object({
		id: z.uuidv4(),
	}),
});

export { tunnelsCreateInputSchema, tunnelsCreateOutputSchema };

