import { z } from "zod";

const sessionExpiredErrorSchema = z.object({
	status: z.literal("error"),
	data: z.object({
		type: z.literal("auth"),
		message: z.literal("SessionExpired"),
	})
})

const defaultSchema = <T extends z.ZodTypeAny>(schema: T) => {
	return z.union([schema, sessionExpiredErrorSchema]);
};

export default defaultSchema;
export { sessionExpiredErrorSchema };

