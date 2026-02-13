import z from "zod";
import { tunnelTypeKeys, type GameTunnelType } from "../../tunnel-types";

const tunnelsCreateInputSchema = z.string().refine((value) => {
	try {
		const data = JSON.parse(value);
		const actualSchema = z.object({
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
			endpoint: z.object({
				type: z.enum(["dedicated-ip"]),
				details: z.object({
					ip_hostname: z.string(),
					port: z.number().positive().max(65535).nullable(),
				}),
			}),
			enabled: z.boolean(),
		})

		return actualSchema.safeParse(data).success;
	} catch (e) {
		console.error(e);
		return false;
	}
});

const tunnelsCreateOutputSchema = z.object({
	status: z.literal("success"),
	data: z.object({
		id: z.uuidv4(),
	}),
});

export { tunnelsCreateInputSchema, tunnelsCreateOutputSchema };

