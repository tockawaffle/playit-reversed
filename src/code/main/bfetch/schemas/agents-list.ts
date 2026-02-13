import { z } from "zod";

const agentsListOutputSchema = z.object({
	status: z.string(),
	data: z.object({
		agents: z.array(
			z.object({
				id: z.uuidv4(),
				name: z.string(),
				created_at: z.string(),
				agent_version: z.object({
					variant_id: z.uuidv4(),
					schema_id: z.uuidv4(),
					name: z.string(),
					version: z.string(),
					platform: z.string(),
				}),
				self_managed: z.boolean(),
				status: z.object({
					state: z.enum(["connected", "offline"]),
					data: z.object({
						data_center_id: z.number(),
						data_center_name: z.string(),
						client_addr: z.string(),
						tunnel_addr: z.string(),
						activity_latest_epoch_ms: z.number(),
						activity_start_epoch_ms: z.number(),
					}),
				}),
				routing: z.object({
					type: z.enum(["Automatic", "Manual"]),
				}),
				routing_disabled_ip6: z.boolean(),
				sort_num: z.number(),
			})
		)
	})
})

export {
	agentsListOutputSchema
};

