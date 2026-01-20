import { createSchema } from "@better-fetch/fetch";
import z from "zod";

/**
 * API schema definitions for better-fetch
 */
export const playitSchema = createSchema({
	"/account/agents": {
		output: z.string(),
		method: "get"
	},
	"/account/agents/:agentId/tunnels": {
		output: z.string(),
		method: "get",
		params: z.object({
			agentId: z.string()
		})
	},
	"/account/tunnels/:agentId": {
		output: z.string(),
		method: "get",
		params: z.object({
			agentId: z.string()
		})
	},
	"/account/settings/allocations": {
		output: z.string(),
		method: "get",
	},
	"/account/agents/:agentId/tunnels/add/:tunnelType?accepted=true&_data=root": {
		output: z.string(),
		method: "post",
		params: z.object({
			agentId: z.string(),
			tunnelType: z.string()
		}),
		query: z.object({
			accepted: z.boolean(),
			_data: z.literal(encodeURIComponent("root"))
		})
	},
}, { strict: false });

//https://playit.gg/account/settings/allocations?_data=routes%2Faccount%2Fsettings%2Fallocations