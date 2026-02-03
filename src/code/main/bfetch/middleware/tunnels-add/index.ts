import type { RequestContext } from "@better-fetch/fetch";
import addTunnelSchema from "../../schemas/add-shared";

export default async function tunnelsAddMiddlewareReq(context: RequestContext) {
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
}