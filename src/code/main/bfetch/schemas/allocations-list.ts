import { z } from "zod";

export const allocationsListInputSchema = z.object({
	alloc_id: z.unknown().nullable(),
});

export const allocationsListOutputSchema = z.object({
	status: z.literal("success"),
	data: z.object({
		ports: z.array(z.unknown()),
		ips: z.array(
			z.object({
				ip_hostname: z.string(),
				sub_id: z.nullable(z.string()),
				region: z.string(),
				ip_type: z.string(),
				gre_target: z.nullable(z.string()),
			}),
		),
	}),
});
