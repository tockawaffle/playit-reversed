import type { RequestContext, ResponseContext } from "@better-fetch/fetch";
import type z from "zod";
import type addDedicatedIpSchema from "../../schemas/add-dedicated-ip";

export async function tunnelsAddDedicatedIpMiddlewareReq(modifiedContext: RequestContext) {
	// Use query from context (better-fetch passes it here)
	const query = modifiedContext.query || {};
	const body = modifiedContext.body as z.infer<typeof addDedicatedIpSchema["body"]>;

	// Get the URL object (ensure it's a URL, not a string)
	const url = typeof modifiedContext.url === 'string'
		? new URL(modifiedContext.url, modifiedContext.baseURL || 'https://playit.gg')
		: modifiedContext.url;

	// Automatically add 'accepted' parameter if missing and required
	if ((body.tunnel_type === "both" || body.tunnel_type === "tcp" || body.tunnel_type === "udp")
		&& (query.accepted === undefined || query.accepted === false)) {
		// Add accepted=true to URL searchParams
		url.searchParams.set('accepted', 'true');
	}

	// Always add _data parameter with exact encoding (append manually to avoid double-encoding)
	const separator = url.search ? '&' : '?';
	url.search += separator + '_data=routes%2Faccount%2Fagents%2F%24agentId%2Ftunnels%2Fadd%2Fdedicated-ip';

	// Update the context with the modified URL
	modifiedContext.url = url;

	// Parse the body as a string
	// Order matters: _csrf_token, dedicated_ip, tunnel_type, [tunnel-desc], public_port, [port_count], enabled
	const isPortType = body.tunnel_type === "both" || body.tunnel_type === "tcp" || body.tunnel_type === "udp";

	const bodyEntries: [string, string][] = [
		['_csrf_token', body._csrf_token],
		['dedicated_ip', body.dedicated_ip],
		['tunnel_type', body.tunnel_type],
	];

	// For "both", "tcp", "udp": include tunnel-desc before public_port
	if (isPortType) {
		bodyEntries.push(['tunnel-desc', body['tunnel-desc']!]);
	}

	// public_port is required for all tunnel types
	bodyEntries.push(['public_port', String(body.public_port)]);

	// port_count only for port types, comes after public_port
	if (isPortType) {
		bodyEntries.push(['port_count', body.port_count !== undefined ? String(body.port_count) : '']);
	}

	// enabled is always last
	bodyEntries.push(['enabled', body.enabled]);

	const bodyString = new URLSearchParams(bodyEntries).toString();

	modifiedContext.body = bodyString;
	return modifiedContext;
}

export async function tunnelsAddDedicatedIpMiddlewareRes(modifiedContext: ResponseContext) {
	// Check the headers for the headers: x-remix-redirect and x-remix-status
	const redirectHeader = modifiedContext.response.headers.get("x-remix-redirect");
	const statusHeader = modifiedContext.response.headers.get("x-remix-status");
	if (!redirectHeader || !statusHeader || statusHeader !== "302") throw new Error("Tunnel allocation not found, the tunnel might not have been created. Please check the playit dashboard to see if the tunnel was created.")

	// Get the id out of the redirect header
	const id = redirectHeader.split("/").pop();
	if (!id) throw new Error("Tunnel allocation not found, the tunnel might not have been created. Please check the playit dashboard to see if the tunnel was created.")

	return new Response(JSON.stringify({
		allocation: id,
		status: statusHeader,
	}), {
		status: 200,
		statusText: "OK",
		headers: {
			'content-type': 'application/json',
			...modifiedContext.response.headers,
		},
	});
}