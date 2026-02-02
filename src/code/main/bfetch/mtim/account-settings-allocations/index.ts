import type { ResponseContext } from "@better-fetch/fetch";
import debug from "debug";
import { allocationOutputSchema } from "../../schemas/settings-allocations";

const debugAccountSettingsAllocations = debug("playit:bfetch:mtim:account-settings-allocations");
export default async function asaMitmResponse(modifiedContext: ResponseContext) {
	const redirectHeader = modifiedContext.response.headers.get("x-remix-redirect")
	if (redirectHeader && redirectHeader.includes("/login?")) { throw new Error("Something went wrong, either your token is invalid, expired the API is messing us up."); }

	// Clone the response to read the body without consuming it
	const clonedResponse = modifiedContext.response.clone();
	const html = await clonedResponse.text();

	// Extract window.__remixContext JSON by brace matching (regex can't handle }; inside strings)
	const prefix = 'window.__remixContext';
	const idx = html.indexOf(prefix);
	if (idx === -1) {
		throw new Error('Could not find window.__remixContext in HTML response. Likely your token is invalid or expired.');
	}
	const afterPrefix = html.slice(idx + prefix.length);
	const eqMatch = afterPrefix.match(/^\s*=\s*\{/);
	if (!eqMatch) {
		throw new Error('Could not find window.__remixContext = { in HTML response. Likely your token is invalid or expired.');
	}
	const objectStart = idx + prefix.length + eqMatch[0].length - 1; // index of the opening {
	let depth = 0;
	let inString: '"' | "'" | null = null;
	let i = objectStart;
	let remixContext: unknown = null;
	while (i < html.length) {
		const c = html[i];
		if (inString) {
			if (c === '\\') { i += 2; continue; }
			if (c === inString) { inString = null; i++; continue; }
			i++;
			continue;
		}
		if (c === '"' || c === "'") { inString = c; i++; continue; }
		if (c === '{') { depth++; i++; continue; }
		if (c === '}') {
			depth--;
			if (depth === 0) {
				const jsonSlice = html.slice(objectStart, i + 1);
				remixContext = JSON.parse(jsonSlice);
				break;
			}
			i++;
			continue;
		}
		i++;
	}
	if (depth !== 0 || remixContext === null) {
		throw new Error('Could not find balanced braces for window.__remixContext in HTML response.');
	}

	// Validate and return as JSON response
	// validate the remixContext with the schema
	const result = allocationOutputSchema.safeParse(remixContext);
	if (!result.success) {
		throw new Error('Invalid remixContext: ' + result.error.message);
	}

	const newResponse = new Response(JSON.stringify(remixContext), {
		status: modifiedContext.response.status,
		statusText: modifiedContext.response.statusText,
		headers: {
			...Object.fromEntries(modifiedContext.response.headers.entries()),
			'content-type': 'application/json',
		},
	});

	return {
		...modifiedContext,
		response: newResponse,
	};
}