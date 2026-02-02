import type { RequestContext } from "@better-fetch/fetch";
import type z from "zod";
import type renameTunnelSchema from "../../schemas/tunnels-rename";

export default async function tunnelsRenameMitmReq(modifiedContext: RequestContext) {
	const body = modifiedContext.body as z.infer<typeof renameTunnelSchema["body"]>;

	// Get the URL object (ensure it's a URL, not a string)
	const url = typeof modifiedContext.url === 'string'
		? new URL(modifiedContext.url, modifiedContext.baseURL || 'https://playit.gg')
		: modifiedContext.url;

	// Always add _data parameter with exact encoding (append manually to avoid double-encoding)
	const separator = url.search ? '&' : '?';
	url.search += separator + '_data=routes%2Faccount%2Ftunnels%2F%24tunnelId%2Frename';

	// Update the context with the modified URL
	modifiedContext.url = url;

	// Parse the body as a string
	const bodyEntries: [string, string][] = [
		['_csrf_token', body._csrf_token],
		['name', body.name],
	];

	const bodyString = new URLSearchParams(bodyEntries).toString();

	modifiedContext.body = bodyString;

	return modifiedContext;
}