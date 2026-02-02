import type { RequestContext } from "@better-fetch/fetch";
import type z from "zod";
import type tunnelsRatelimitSchema from "../../schemas/tunnels-ratelimit";

export default async function tunnelsRatelimitMitmReq(modifiedContext: RequestContext) {
	const body = modifiedContext.body as z.infer<typeof tunnelsRatelimitSchema["body"]>;

	// Get the URL object (ensure it's a URL, not a string)
	const url = typeof modifiedContext.url === 'string'
		? new URL(modifiedContext.url, modifiedContext.baseURL || 'https://playit.gg')
		: modifiedContext.url;

	// Always add _data parameter with exact encoding (append manually to avoid double-encoding)
	const separator = url.search ? '&' : '?';
	url.search += separator + '_data=routes%2Faccount%2Ftunnels%2F%24tunnelId%2Fratelimit';

	// Update the context with the modified URL
	modifiedContext.url = url;

	// Parse the body as a string
	const bodyEntries: [string, string][] = [
		['_csrf_token', body._csrf_token],
		['tunnel_id', body.tunnel_id],
		['bps', String(body.bps)],
		['pps', String(body.pps)],
	];

	const bodyString = new URLSearchParams(bodyEntries).toString();

	modifiedContext.body = bodyString;

	return modifiedContext;
}