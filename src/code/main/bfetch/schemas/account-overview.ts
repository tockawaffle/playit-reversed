import { z } from "zod";

export const accountOverviewOutputSchema = z.object({
	status: z.literal("success"),
	data: z.object({
		account_id: z.number(),
		created_at: z.string(),
		account_status: z.string(),
		email: z.email(),
		email_change: z.nullable(z.string()),
		email_verified: z.boolean(),
		discord_connected: z.boolean(),
		totp_setup: z.string(),
		purchases_restricted: z.boolean(),
		has_premium: z.boolean(),
		month_usage_bytes: z.number(),
		failed_invoice_id: z.nullable(z.number()),
		delete_scheduled_at: z.nullable(z.string()),
		notice: z.nullable(z.string()),
		show_admin: z.boolean(),
		is_possesed: z.boolean(),
		in_review: z.boolean(),
	}),
});
