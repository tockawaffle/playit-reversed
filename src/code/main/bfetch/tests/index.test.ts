import { expect, test } from "bun:test";
import type z from "zod";
import { createPlayItFetch, playitSchema } from "../../bfetch";
import { sessionExpiredErrorSchema } from "../schemas/@defaults/session-expired";
import { agentsListOutputSchema } from "../schemas/agents-list";
import { tunnelsListOutputSchema } from "../schemas/tunnels-list";

import { atom } from "nanostores";
const testResults = atom<{
	testFinished: boolean;
	tunnelIds: string[];
}>({
	testFinished: false,
	tunnelIds: [] as string[]
});

async function deleteTunnel(tunnelId: string) {
	const $fetch = createPlayItFetch();
	const { error, data } = await $fetch("@post/tunnels/delete", {
		body: JSON.stringify({
			tunnel_id: tunnelId
		})
	})
	if (error) throw new Error(`Failed to delete tunnel: ${JSON.stringify(error)}`);
	expect(data).toBeObject();
	expect(playitSchema.schema["@post/tunnels/delete"].output.safeParse(data).success).toBeTrue();
}

type ErrorBody = z.infer<typeof sessionExpiredErrorSchema>;
test("test tunnels list", async () => {
	const $fetch = createPlayItFetch();
	const { data, error } = await $fetch<z.infer<typeof tunnelsListOutputSchema>, {
		status: number,
		statusText: string,
		data: ErrorBody["data"]
	}>("@post/v1/tunnels/list");
	if (error) {
		expect(error.status).toBe(401);
		expect(error.statusText).toBe("Unauthorized");
		expect(error.data).toBeDefined();
		expect(error.data.type).toBe("auth");
		expect(error.data.message).toBe("SessionExpired");
		throw new Error("Session expired");
	}
	expect(data).toBeObject();
	expect(tunnelsListOutputSchema.safeParse(data).success).toBeTrue();
});

test("test agents list", async () => {
	const $fetch = createPlayItFetch();
	const { data, error } = await $fetch("@post/agents/list");
	if (error) throw new Error(`Failed to fetch agents list: ${JSON.stringify(error)}`);
	expect(data).toBeObject();

	expect(agentsListOutputSchema.safeParse(data).success).toBeTrue();
});

test("test create dedicated ip tunnel (protocol)", async () => {
	const $fetch = createPlayItFetch();
	const { data, error } = await $fetch("@post/v1/tunnels/create", {
		body: JSON.stringify({
			"name": "Webserver",
			"protocol": {
				"type": "raw-ports",
				"details": {
					"port_type": "both",
					"port_count": 1,
					"software_description": "Simple webserver API"
				}
			},
			"origin": {
				"type": "agent",
				"data": {
					"agent_id": "a86750f2-86f6-4a6c-8bb7-066c1180ae02",
					"config": {
						"fields": [
							{
								"name": "local_ip",
								"value": "127.0.0.1"
							},
							{
								"name": "local_port",
								"value": "8091"
							}
						]
					}
				}
			},
			"endpoint": {
				"type": "dedicated-ip",
				"details": {
					"ip_hostname": "195.ip.sa.ply.gg",
					"port": null
				}
			},
			"enabled": true
		})
	})
	if (error) throw new Error(`Failed to create dedicated ip tunnel (protocol): ${JSON.stringify(error)}`);
	expect(data).toBeObject();
	expect(playitSchema.schema["@post/v1/tunnels/create"].output.safeParse(data).success).toBeTrue();
	testResults.set({ ...testResults.get(), tunnelIds: [...testResults.get().tunnelIds, data.data.id] });
})

test("test create dedicated ip tunnel (game type)", async () => {
	const $fetch = createPlayItFetch();
	const { data, error } = await $fetch("@post/v1/tunnels/create", {
		body: JSON.stringify({
			"name": "Minecraft (Nuvisca)",
			"protocol": {
				"type": "tunnel-type",
				"details": "minecraft-java"
			},
			"origin": {
				"type": "agent",
				"data": {
					"agent_id": "a86750f2-86f6-4a6c-8bb7-066c1180ae02",
					"config": {
						"fields": [
							{
								"name": "local_ip",
								"value": "127.0.0.1"
							},
							{
								"name": "local_port",
								"value": "25565"
							}
						]
					}
				}
			},
			"endpoint": {
				"type": "dedicated-ip",
				"details": {
					"ip_hostname": "195.ip.sa.ply.gg",
					"port": null
				}
			},
			"enabled": true
		})
	})
	if (error) throw new Error(`Failed to create dedicated ip tunnel (game type): ${JSON.stringify(error)}`);
	expect(data).toBeObject();
	expect(playitSchema.schema["@post/v1/tunnels/create"].output.safeParse(data).success).toBeTrue();
	testResults.set({ ...testResults.get(), tunnelIds: [...testResults.get().tunnelIds, data.data.id] });
})

test("list tunnels and check if the created tunnels are listed", async () => {
	const $fetch = createPlayItFetch();
	const { data, error } = await $fetch("@post/v1/tunnels/list");
	if (error) throw new Error(`Failed to list tunnels: ${JSON.stringify(error)}`);
	expect(data).toBeObject();
	expect(tunnelsListOutputSchema.safeParse(data).success).toBeTrue();
	const { status, data: tunnelsData } = data;
	if (status !== "success") throw new Error(`Failed to list tunnels: ${JSON.stringify(data)}`);
	const { tunnels } = tunnelsData;
	const createdTunnelIds = testResults.get().tunnelIds;
	// Check that each created tunnel exists in the list
	for (const createdTunnelId of createdTunnelIds) {
		const tunnel = tunnels.find(t => t.id === createdTunnelId);
		expect(tunnel).toBeDefined();
		if (!tunnel) continue;

		switch (createdTunnelId) {
			case createdTunnelIds[0]:
				expect(tunnel.name).toBe("Webserver");
				expect(tunnel.port_type).toBe("both");
				expect(tunnel.tunnel_type).toBe(null);
				expect(tunnel.port_count).toBe(1);
				break;
			case createdTunnelIds[1]:
				expect(tunnel.name).toBe("Minecraft (Nuvisca)");
				expect(tunnel.port_type).toBe("tcp");
				expect(tunnel.port_count).toBe(1);
				expect(tunnel.tunnel_type).toBe("minecraft-java");
				break;
			default:
				throw new Error(`Unknown tunnel id: ${createdTunnelId}`);
		}
	}
});

test("finish test and delete all created tunnels", async () => {
	for (const tunnelId of testResults.get().tunnelIds) {
		await deleteTunnel(tunnelId);
	}
	testResults.set({ ...testResults.get(), testFinished: true });
})