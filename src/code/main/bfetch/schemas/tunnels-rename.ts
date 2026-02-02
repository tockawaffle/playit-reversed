import z from "zod";

const renameTunnelSchema = {
	params: z.object({
		tunnelId: z.string()
	}),
	body: z.object({
		_csrf_token: z.string(),
		name: z.string().refine((value) => {
			return value.length > 0 && value.length <= 50;
		}, { message: "Name must be between 1 and 50 characters long" }),
	})
}

export default renameTunnelSchema;