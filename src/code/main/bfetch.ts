import { createFetch, createSchema, type CreateFetchOption } from "@better-fetch/fetch";
import "dotenv/config";
import z from "zod";

import asaMitmResponse from "./bfetch/mtim/account-settings-allocations";
import { tunnelsAddDedicatedIpMitmReq, tunnelsAddDedicatedIpMitmRes } from "./bfetch/mtim/tunnels-add-dedicated-io";
import tunnelsDeleteMitmReq from "./bfetch/mtim/tunnels-delete";
import tunnelsRatelimitMitmReq from "./bfetch/mtim/tunnels-ratelimit";
import tunnelsRenameMitmReq from "./bfetch/mtim/tunnels-rename";
import addDedicatedIpSchema from "./bfetch/schemas/add-dedicated-ip";
import addTunnelSchema from "./bfetch/schemas/add-shared";
import { allocationOutputSchema } from "./bfetch/schemas/settings-allocations";
import tunnelsRatelimitSchema from "./bfetch/schemas/tunnels-ratelimit";
import renameTunnelSchema from "./bfetch/schemas/tunnels-rename";

import Debug from "debug";
const debugMtim = Debug("playit:bfetch:mtim");

// In-memory cookie storage
let storedCookie: string | null = null;

export const playitSchema = createSchema({
	/** Create a new dedicated IP tunnel for an agent. */
	"@post/account/agents/:agentId/tunnels/add/dedicated-ip": {
		params: addDedicatedIpSchema.params,
		body: z.string().refine((value) => {
			const body = JSON.parse(value);
			const result = addDedicatedIpSchema.body.safeParse(body);
			if (!result.success) {
				throw new Error(result.error.message);
			}
			return result.success;
		}, {
			message: "Invalid body, must be a valid JSON object",
			path: ["body"],
		}),
		method: "post"
	},
	/** Creates a shared region tunnel for an agent.
	 * @warning Note that the "local_port" argument is the actual port that will be used on the local machine, not the public port. The public port will be assigned automatically by the PlayIt server, so when accessing your service you have to use the port that the server has assigned to you.
	 */
	"@post/account/agents/:agentId/tunnels/add": {
		params: z.object({
			agentId: z.string()
		}),
		body: z.string().refine((value) => {
			const body = JSON.parse(value);

			const result = addTunnelSchema.safeParse(body);
			if (!result.success) {
				throw new Error(result.error.message);
			}
			return result.success;
		}, {
			message: "Invalid body, must be a valid JSON object",
			path: ["body"],
		}),
		method: "post"
	},
	/** This endpoint is used to get all of the data for the account, including agents and tunnels. */
	"@get/account/settings/allocations": {
		output: allocationOutputSchema,
		method: "get"
	},
	/** This endpoint is used to get all of the tunnels and agents for the account. */
	"@get/account/tunnels?_data=routes%2Faccount": {
		output: allocationOutputSchema.shape.state.shape.loaderData.shape["routes/account"],
		method: "get"
	},
	/** Deletes a tunnel by its ID. */
	"@post/account/tunnels/:tunnelId/delete": {
		method: "post",
		params: z.object({
			tunnelId: z.string()
		}),
		body: z.object({
			_csrf_token: z.string()
		})
	},
	/** This endpoint is used to rename a tunnel by its ID. */
	"@post/account/tunnels/:tunnelId/rename": {
		...renameTunnelSchema,
		method: "post",
	},
	/** This endpoint is used to set the ratelimit for a tunnel by its ID. I coudn"t see it working, but it"s here just in case. */
	"@post/account/tunnels/:tunnelId/ratelimit": {
		method: "post",
		...tunnelsRatelimitSchema
	},
	"@get/account/tunnels/:tunnelId": {
		method: "get",
	}
}, { strict: true });


/**
 * @warning onRequest and onResponse will be ignored if the ignoreMiddleware option is not passed.
 * @param options - The options for the fetch request.
 * @param options.ignoreMiddleware - If true, the middleware will not be used. This is not recommended as it will bypass the middleware and the request will not be MITM"d.
 * @returns A fetch function that can be used to make requests to the PlayIt API.
 */
export function createPlayItFetch(options?: Omit<CreateFetchOption, "schema"> & { ignoreMiddleware?: boolean }) {
	const { onRequest: existingOnRequest, onResponse: existingOnResponse, ...restOptions } = options || {};

	// Reject if existing onRequest or onResponse is present as they could potentially override the MITM functionality, unless the ignoreMiddleware option is passed
	if ((existingOnRequest || existingOnResponse) && !options?.ignoreMiddleware) {
		throw new Error("onRequest and onResponse are not recommended when using createPlayItFetch, this is due to the nature of how the middleware works. You may override this by passing the 'ignoreMiddleware' option to createPlayItFetch.");
	}

	// Use stored cookie if available, otherwise fall back to env variable
	const initialCookie = storedCookie || process.env.PLAYIT_API_KEY;

	if (!initialCookie) {
		throw new Error("PLAYIT_API_KEY is not set or is invalid");
	}

	return createFetch({
		...restOptions,
		baseURL: "https://playit.gg",
		headers: {
			"accept": "*/*",
			"accept-encoding": "gzip, deflate, br, zstd",
			"accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
			"content-type": "application/x-www-form-urlencoded;charset=UTF-8",
			"dnt": "1",
			"origin": "https://playit.gg",
			"priority": "u=1, i",
			"sec-ch-ua": "'Not(A:Brand';v='8', 'Chromium';v='144', 'Brave';v='144'",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "'Windows'",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"sec-gpc": "1",
			"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
			"Cookie": `__session=${initialCookie}`,
		},
		schema: playitSchema,
		onRequest: async (context) => {
			// Run existing onRequest hook if provided

			// Use stored cookie if available, otherwise fall back to env variable
			const cookieValue = storedCookie || process.env.PLAYIT_API_KEY;
			if (cookieValue && cookieValue != initialCookie) {
				debugMtim("[onRequest] Setting cookie", cookieValue);
				context.headers = context.headers || new Headers();
				context.headers.set("Cookie", `__session=${cookieValue}`);
			}

			// Validate dedicated IP requests
			const urlString = typeof context.url === "string"
				? context.url
				: context.url.toString();

			debugMtim("[onRequest] URL: ", urlString);

			if (urlString.includes("/tunnels/add/dedicated-ip") && context.body) {
				return await tunnelsAddDedicatedIpMitmReq(context);
			} else if (urlString.includes("/tunnels/") && urlString.includes("/rename") && context.body) {
				return await tunnelsRenameMitmReq(context);
			} else if (urlString.includes("/tunnels/") && urlString.includes("/delete") && context.body) {
				return await tunnelsDeleteMitmReq(context);
			} else if (urlString.includes("/tunnels/") && urlString.includes("/ratelimit") && context.body) {
				return await tunnelsRatelimitMitmReq(context);
			} else if (urlString.includes("/tunnels/add") && !urlString.includes("/dedicated-ip") && context.body) {
				// Parse body (may be string from schema or object from caller) and validate
				const rawBody = context.body;
				const parsedBody = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
				const parseResult = addTunnelSchema.safeParse(parsedBody);
				if (!parseResult.success) {
					throw new Error(
						"Tunnel add body validation failed: " + parseResult.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")
					);
				}
				const body = parseResult.data;

				// Use query from context (better-fetch passes it here)
				const query = context.query || {};

				// Get the URL object (ensure it"s a URL, not a string)
				const url = typeof context.url === "string"
					? new URL(context.url, context.baseURL || "https://playit.gg")
					: context.url;

				// Automatically add "accepted" parameter if missing and required
				url.searchParams.set("index", "");
				if ((body.tunnel_type === "both" || body.tunnel_type === "tcp" || body.tunnel_type === "udp")
					&& (query.accepted === undefined || query.accepted === false)) {
					// Add index=&accepted=true to URL searchParams
					url.searchParams.set("accepted", "true");
				}

				// Always add _data parameter with exact encoding (append manually to avoid double-encoding)
				const separator = url.search ? "&" : "?";
				url.search += separator + "_data=routes%2Faccount%2Fagents%2F%24agentId%2Ftunnels%2Fadd%2Findex";

				// Update the context with the modified URL
				context.url = url;

				// Form field order to match API: _csrf_token, region, tunnel_type, tunnel-desc, port_count, local_port, enabled
				const isPortType = body.tunnel_type === "both" || body.tunnel_type === "tcp" || body.tunnel_type === "udp";

				const bodyEntries: [string, string][] = [
					["_csrf_token", body.__csrf_token],
					["region", body.region],
					["tunnel_type", body.tunnel_type],
				];
				if (isPortType) {
					bodyEntries.push(["tunnel-desc", body["tunnel-desc"]!]);
					bodyEntries.push(["port_count", String(body.port_count!)]);
				}
				bodyEntries.push(["local_port", String(body.local_port!)]);
				bodyEntries.push(["enabled", body.enabled]);

				const bodyString = new URLSearchParams(bodyEntries).toString();

				context.body = bodyString;
				return context;
			} else if (urlString.includes("/account/tunnels")) {
				const url = typeof context.url === "string"
					? new URL(context.url, context.baseURL || "https://playit.gg")
					: context.url;


				// Add referer header by using the same query parameters as the original request
				context.headers.set("Referer", url.toString());

				const separator = url.search ? "&" : "?";
				url.search += separator + "_data=routes%2Faccount"


				context.url = url;
				return context;
			}

			return context;
		},
		onResponse: async (context) => {
			// Process allocations endpoint HTML response
			const urlString = typeof context.request.url === "string"
				? context.request.url
				: context.request.url.toString();

			debugMtim("[onResponse] Response headers for url: ", context.response.headers.forEach((value, key) => {
				return {
					[key]: value,
				};
			}));

			// // Check if we have the Set-Cookie header and update the context with the new cookie
			// const setCookieHeader = context.response.headers.get("Set-Cookie");
			// if (setCookieHeader) {
			// 	debugMtim("[onResponse] Set-Cookie header found, setting new cookie: ", setCookieHeader);
			// 	// Extract the __session cookie value from Set-Cookie header
			// 	// Format: "__session=value; Path=/; HttpOnly; Secure; SameSite=Lax"
			// 	const sessionMatch = setCookieHeader.match(/__session=([^;]+)/);
			// 	if (sessionMatch && sessionMatch[1]) {
			// 		const newCookieValue = sessionMatch[1];
			// 		// Store in-memory for future requests
			// 		storedCookie = newCookieValue;
			// 		// Update the request headers for this response context
			// 		context.request.headers.set("Cookie", `__session=${newCookieValue}`);
			// 		// Add on the body the _csrf_token and the new cookie value for the user to do whatever they want with it
			// 	}
			// }

			if (urlString.includes("/account/settings/allocations")) {
				return await asaMitmResponse(context);
			} else if (urlString.includes("/tunnels/add")) {
				return await tunnelsAddDedicatedIpMitmRes(context);
			}

			return context;
		}
	});
}