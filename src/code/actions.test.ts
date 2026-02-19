import { expect, test } from "bun:test";
import { CreateTunnel, deleteTunnel as deleteTunnelAction } from "./actions";

const agentId = "a86750f2-86f6-4a6c-8bb7-066c1180ae02";

async function deleteTunnel(tunnelId: string) {
	const result = await deleteTunnelAction(tunnelId);
	expect(result).toBeTrue();
}

test("test create tunnel", async () => {
	const tunnel = await CreateTunnel({
		name: "Test Tunnel",
		config: {
			fields: [
				{
					name: "local_ip",
					value: "127.0.0.1",
				},
			],
		},
		endpoint: {
			type: "dedicated-ip",
			details: {
				ip_hostname: "195.ip.sa.ply.gg",
				port: null,
			},
		},
		agentId: "a86750f2-86f6-4a6c-8bb7-066c1180ae02",
		protocol: {
			type: "raw-ports",
			details: {
				port_type: "both",
				port_count: 1,
				software_description: "Webserver API",
			},
		},
	});
	expect(tunnel).toBeDefined();
	if (!tunnel) throw new Error("Tunnel ID is undefined");
	await deleteTunnel(tunnel.id);
}, { timeout: 5 * 60 * 1000 });