import { expect, test } from "bun:test";
import debug from "debug";
import { z } from "zod";
import { playit } from "../generated/playit";
import { AllocatedTunnelAlloc } from "../generated/types";
import { user } from "../generated/user";
import { createPlayItFetch } from "../src/code/main/bfetch";
import { allocationOutputSchema } from "../src/code/main/bfetch/schemas/settings-allocations";

const debugTests = debug("playit:tests");

// Generate a random port between 3024 and 65535
function generateRandomPort() {
	// First check which ports are already in use
	let portsInUse: number[] = [];
	playit.agents.capaodocorvo_srv.tunnels.forEach(tunnel => {
		if (tunnel.alloc.status === "allocated") {
			const allocData = (tunnel.alloc as AllocatedTunnelAlloc).data;
			if (!allocData) return;
			portsInUse.push(allocData.port_start!, allocData.port_end!);
		}
	});

	// Then generate a random port that is not in use
	let randomPort = Math.floor(Math.random() * (65535 - 3024 + 1)) + 3024;
	while (portsInUse.includes(randomPort)) {
		randomPort = Math.floor(Math.random() * (65535 - 3024 + 1)) + 3024;
	}
	return randomPort;
}

async function assertTunnelIsDeleted(tunnelId: string) {
	expect(z.uuidv4().safeParse(tunnelId).success).toBeTrue();
	await playit.tunnel(tunnelId).delete();

	const $fetch = createPlayItFetch();
	const { data, error } = await $fetch("@get/account/settings/allocations")
	if (error) throw new Error(`Failed to fetch allocations: ${error.message}`);

	expect(data).toBeObject();
	expect(allocationOutputSchema.safeParse(data).success).toBeTrue();
	debugTests("[TEST] Allocations data: ", data);
	const tunnels = data.state.loaderData["routes/account"].tunnels.tunnels;
	// Check if the tunnel is not in the response
	debugTests("[TEST] Checking if tunnel is deleted: ");
	const tunnel = tunnels.find(tunnel => tunnel.alloc.data!.id === tunnelId);
	expect(tunnel).toBeUndefined();
	debugTests("[TEST] Tunnel is deleted");
}

test("create a new static IP tunnel with both UDP and TCP ports and wait for allocation and allocated status", async () => {
	const randomPort = generateRandomPort();
	const tunnel = await playit.agents.capaodocorvo_srv.createStaticIpTunnel({
		dedicated_ip: playit.allocations["195_ip_sa_ply_gg"].ip_hostname,
		__csrf_token: user.csrfToken,
		tunnel_type: "both",
		public_port: randomPort,
		enabled: "on",
		"tunnel-desc": "Test Tunnel",
		port_count: 1,
	}, true, true);

	expect(tunnel).toBeDefined();
	expect(tunnel.status).toBe("allocated");
	if (tunnel.status === "allocated") {
		expect(tunnel.data).toBeObject();
		const allocData = tunnel.data
		if (!allocData) throw new Error("Alloc data is undefined");
		expect(z.uuidv4().safeParse(allocData.mainId).success).toBeTrue();
		expect(allocData.ip_hostname).toBe(playit.allocations["195_ip_sa_ply_gg"].ip_hostname);
		expect(allocData.port_start).toBe(randomPort);
		expect(allocData.port_end).toBe(randomPort + 1);
		expect(allocData.ip_type).toBe("both");
		expect(allocData.region).toBe("south-america");
		expect(allocData.assigned_domain).toBeString();
		expect(allocData.assigned_srv).toBeNull();
		expect(allocData.tunnel_ip).toBeString();
		expect(allocData.static_ip4).toBeString();
		expect(allocData.static_ip6).toBeString();
		expect(allocData.id).toBeString();
		expect(allocData.region).toBe("south-america");
		expect(allocData.ip_type).toBe("both");
		debugTests("[TEST] Tunnel created: ", tunnel);
		debugTests("[TEST] Deleting tunnel...");
		await assertTunnelIsDeleted(allocData.mainId);
		debugTests("[TEST] Tunnel deleted");
	}
}, { timeout: 60 * 1000 }) // At least 60 seconds for the tunnel to be created and deleted

test("create a new region tunnel with both UDP and TCP ports and wait for allocation and allocated status", async () => {
	const randomPort = generateRandomPort();
	const tunnel = await playit.agents.capaodocorvo_srv.createRegionTunnel({
		user: user,
		csrfToken: user.csrfToken,
		region: "south-america",
		tunnelType: "both",
		tunnelCreationReason: "Test Tunnel",
		localPort: randomPort,
		portCount: 1,
	}, true, true);

	expect(tunnel).toBeDefined();
	expect(tunnel.status).toBe("allocated");
	if (tunnel.status === "allocated") {
		expect(tunnel.data).toBeObject();
		const allocData = tunnel.data
		if (!allocData) throw new Error("Alloc data is undefined");
		expect(z.uuidv4().safeParse(allocData.mainId).success).toBeTrue();
		expect(allocData.ip_hostname).toBeString();
		expect(allocData.port_start).toBeNumber();
		expect(allocData.port_end).toBeNumber();

		debugTests("[TEST] Deleting tunnel...");
		await assertTunnelIsDeleted(allocData.mainId);
		debugTests("[TEST] Tunnel deleted");
	}
}, { timeout: 60 * 1000 }) // At least 60 seconds for the tunnel to be created and deleted

test("create a new dedicated IP application tunnel and wait for allocation and allocated status", async () => {
	const randomPort = generateRandomPort();
	const tunnel = await playit.agents.capaodocorvo_srv.createStaticIpTunnel({
		dedicated_ip: playit.allocations["195_ip_sa_ply_gg"].ip_hostname,
		__csrf_token: user.csrfToken,
		public_port: randomPort,
		enabled: "on",
		tunnel_type: "minecraft-java",
	}, true, true);

	expect(tunnel).toBeDefined();
	expect(tunnel.status).toBe("allocated");
	if (tunnel.status === "allocated") {
		expect(tunnel.data).toBeObject();
		const allocData = tunnel.data
		if (!allocData) throw new Error("Alloc data is undefined");
		expect(z.uuidv4().safeParse(allocData.mainId).success).toBeTrue();
		expect(allocData.port_start).toBe(randomPort);
		expect(allocData.port_end).toBe(randomPort + 1);
		expect(allocData.ip_type).toBe("both");
		expect(allocData.region).toBe("south-america");
		expect(allocData.assigned_domain).toBeString();
		debugTests("[TEST] Tunnel created: ", tunnel);
		debugTests("[TEST] Deleting tunnel...");
		await assertTunnelIsDeleted(allocData.mainId);
		debugTests("[TEST] Tunnel deleted");
	}
}, { timeout: 60 * 1000 }) // At least 60 seconds for the tunnel to be created and deleted

test("create a new region application tunnel and wait for allocation and allocated status", async () => {
	const tunnel = await playit.agents.capaodocorvo_srv.createRegionTunnel({
		user: user,
		csrfToken: user.csrfToken,
		region: "south-america",
		tunnelType: "minecraft-java",
	}, true, true);

	expect(tunnel).toBeDefined();
	expect(tunnel.status).toBe("allocated");
	if (tunnel.status === "allocated") {
		expect(tunnel.data).toBeObject();
		const allocData = tunnel.data
		if (!allocData) throw new Error("Alloc data is undefined");
		expect(z.uuidv4().safeParse(allocData.mainId).success).toBeTrue();
		expect(allocData.port_start).toBeNumber();
		expect(allocData.port_end).toBeNumber();
		expect(allocData.ip_type).toBe("both");
		expect(allocData.region).toBe("south-america");
		expect(allocData.assigned_domain).toBeString()
		debugTests("[TEST] Tunnel created: ", tunnel);
		debugTests("[TEST] Deleting tunnel...");
		await assertTunnelIsDeleted(allocData.mainId);
		debugTests("[TEST] Tunnel deleted");
	}
}, { timeout: 60 * 1000 }) // At least 60 seconds for the tunnel to be created and deleted