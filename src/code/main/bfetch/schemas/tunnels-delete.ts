import { z } from "zod";

const tunnelsDeleteInputBodySchema = z.object({
	tunnel_id: z.uuidv4(),
});

export const tunnelsDeleteInputSchema = z.string().refine((value) => {
	try {
		const data = JSON.parse(value);
		return tunnelsDeleteInputBodySchema.safeParse(data).success;
	} catch (e) {
		console.error(e);
		return false;
	}
});

export const tunnelsDeleteOutputSchema = z.object({
	status: z.literal("success"),
	data: z.null(),
});
