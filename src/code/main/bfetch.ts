import { createFetch, createSchema, type CreateFetchOption } from "@better-fetch/fetch";
import "dotenv/config";
import { atom } from "nanostores";
import path from "path";

import {
	accountOverviewOutputSchema,
	agentsListOutputSchema,
	allocationsListInputSchema,
	allocationsListOutputSchema,
	sessionExpiredErrorSchema,
	tunnelsCreateInputSchema,
	tunnelsCreateOutputSchema,
	tunnelsDeleteInputSchema,
	tunnelsDeleteOutputSchema,
	tunnelsListOutputSchema,
} from "./bfetch/schemas";

import Debug from "debug";
const debugMtim = Debug("playit:bfetch:mtim");

// this does not guarantee that this will always work, but as far as i tested, it works.
export const storedCookie = atom<string | undefined>(undefined);
const shouldRetryNext = atom<boolean>(false);

export const playitSchema = createSchema({
	/** Get tunnels */
	"@post/v1/tunnels/list": { // why v1?
		output: tunnelsListOutputSchema,
		error: sessionExpiredErrorSchema
	},
	"@post/agents/list": { // Where "v1"?
		output: agentsListOutputSchema,
		error: sessionExpiredErrorSchema
	},
	"@post/login/refresh": {},
	"@post/v1/tunnels/create": {
		input: tunnelsCreateInputSchema,
		output: tunnelsCreateOutputSchema,
		error: sessionExpiredErrorSchema
	},
	"@post/tunnels/delete": {
		input: tunnelsDeleteInputSchema,
		output: tunnelsDeleteOutputSchema,
		error: sessionExpiredErrorSchema
	},
	"@post/account/overview": {
		output: accountOverviewOutputSchema,
		error: sessionExpiredErrorSchema
	},
	"@post/allocations/list": {
		input: allocationsListInputSchema,
		output: allocationsListOutputSchema,
		error: sessionExpiredErrorSchema
	}
}, { strict: true });


/**
 * @warning onRequest and onResponse will be ignored if the ignoreMiddleware option is not passed.
 * @param options - The options for the fetch request.
 * @param options.ignoreMiddleware - If true, the middleware will not be used. This is not recommended as it will bypass the middleware and the request will not be MITM"d.
 * @returns A fetch function that can be used to make requests to the PlayIt API.
 */
export function createPlayItFetch(options?: Omit<CreateFetchOption, "schema" | "retry"> & { ignoreMiddleware?: boolean }) {
	const { onRequest: existingOnRequest, onResponse: existingOnResponse, ...restOptions } = options || {};

	// Reject if existing onRequest or onResponse is present as they could potentially override the MITM functionality, unless the ignoreMiddleware option is passed
	if ((existingOnRequest || existingOnResponse) && !options?.ignoreMiddleware) {
		throw new Error("onRequest and onResponse are not recommended when using createPlayItFetch, this is due to the nature of how the middleware works. You may override this by passing the 'ignoreMiddleware' option to createPlayItFetch.");
	}

	// Use stored cookie if available, otherwise fall back to env variable
	const initialCookie = storedCookie.get() || process.env.PLAYIT_SECURE_WEBAUTH;

	if (!initialCookie) {
		throw new Error("PLAYIT_SECURE_WEBAUTH is not set or is invalid");
	}

	const fetchInstance = createFetch({
		...restOptions,
		baseURL: "https://api.playit.gg",
		headers: {
			'sec-ch-ua-platform': '"Windows"',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
			'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua-mobile': '?0',
			'x-web-version': 'main-97aa738',
			accept: '*/*',
			'sec-gpc': '1',
			'accept-language': 'pt-BR,pt;q=0.9',
			origin: 'https://playit.gg',
			'sec-fetch-site': 'same-site',
			'sec-fetch-mode': 'cors',
			'sec-fetch-dest': 'empty',
			referer: 'https://playit.gg/',
			'accept-encoding': 'gzip, deflate, br, zstd',
			priority: 'u=1, i',
			"Cookie": `__Secure-WebAuth=${initialCookie}`,
		},
		schema: playitSchema,
		retry: {
			type: "linear",
			attempts: options?.retryAttempt ?? 5,
			delay: 0,
			shouldRetry: () => {
				// Check if onResponse marked for retry
				const should = shouldRetryNext.get();
				shouldRetryNext.set(false); // Reset flag
				return should;
			}
		},
		onRequest: async (context) => {
			// Use latest cookie from storage
			const currentCookie = storedCookie.get() || initialCookie;
			context.headers.set("Cookie", `__Secure-WebAuth=${currentCookie}`);

			const urlString = typeof context.url === "string"
				? context.url
				: context.url.toString();

			switch (true) {
				case urlString.includes("v1/tunnels/create"):
					const body = context.body;
					const bodySchema = playitSchema.schema["@post/v1/tunnels/create"].input;
					const bodyParsed = bodySchema.safeParse(body);
					if (!bodyParsed.success) {
						throw new Error(`Invalid body: ${bodyParsed.error.message}`);
					}
					context.body = JSON.stringify(bodyParsed.data);

					debugMtim(`onRequest (Check if body is a JSON string):\nisJson: ${context.body instanceof Object ? "true" : "false"}\nisString: ${typeof context.body === "string" ? "true" : "false"}`)

					return context;
				case urlString.includes("allocations/list"):
					context.body = JSON.stringify(context.body);
					return context;
				default:
					return context;
			}
		},
		onResponse: async (context) => {
			// Check if session expired (before parsing cookies)
			const responseClone = context.response.clone();
			const isRefreshRequest = context.request.url.toString().includes("/login/refresh");

			try {
				const data = await responseClone.json();

				// If session expired and not already a refresh request, refresh and retry
				if (!isRefreshRequest && sessionExpiredErrorSchema.safeParse(data).success) {
					debugMtim("Session expired, refreshing...");

					await fetchInstance("@post/login/refresh", {});
					debugMtim("Session refreshed, will retry");

					// Mark for retry
					shouldRetryNext.set(true);
				}
			} catch (e) {
				// Not JSON or already consumed, ignore
			}

			// Update stored cookie when server sends new one
			const newCookie = context.response.headers.get("set-cookie");
			if (newCookie) {
				const cookieValue = newCookie.split("__Secure-WebAuth=")[1]?.split(";")[0];
				if (cookieValue) {
					debugMtim("New cookie received:", cookieValue);
					storedCookie.set(cookieValue);

					if (process.env.NODE_ENV === "development") {
						console.log("Writing new cookie to .env");
						const envPath = path.join(process.cwd(), ".env");

						// Read existing .env file if it exists
						let envContent = "";
						try {
							const file = Bun.file(envPath);
							if (await file.exists()) {
								envContent = await file.text();
							}
						} catch (e) {
							// File doesn't exist or can't be read, start fresh
						}

						// Update or add PLAYIT_SECURE_WEBAUTH line
						const lines = envContent.split("\n");
						let found = false;
						for (let i = 0; i < lines.length; i++) {
							const line = lines[i];
							if (line && line.startsWith("PLAYIT_SECURE_WEBAUTH=")) {
								lines[i] = `PLAYIT_SECURE_WEBAUTH=${cookieValue}`;
								found = true;
								break;
							}
						}

						// If not found, append it
						if (!found) {
							lines.push(`PLAYIT_SECURE_WEBAUTH=${cookieValue}`);
						}

						// Write back to file
						await Bun.write(envPath, lines.join("\n"));
					}
				}
			}

			return context;
		},
	});

	return fetchInstance;
}