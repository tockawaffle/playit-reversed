import { expect, test } from "bun:test";
import debug from "debug";
import { z } from "zod";
import { playit } from "../generated/playit";

const debugTests = debug("playit:tests");

function generateRandomPort() {
	const portsInUse: number[] = [];
	playit.agents.capaodocorvo_srv.tunnels.forEach(tunnel => {
		for (const alloc of tunnel.public_allocations) {
			if (alloc.type === "PortAllocation") {
				portsInUse.push(alloc.details.port);
			}
		}
	});

	let randomPort = Math.floor(Math.random() * (65535 - 3024 + 1)) + 3024;
	while (portsInUse.includes(randomPort)) {
		randomPort = Math.floor(Math.random() * (65535 - 3024 + 1)) + 3024;
	}
	return randomPort;
}

async function assertTunnelIsDeleted(tunnelId: string) {
	expect(z.uuidv4().safeParse(tunnelId).success).toBeTrue();
	await playit.tunnel(tunnelId).delete();

	const tunnels = await playit.getTunnels();
	const tunnel = tunnels.find(t => t.id === tunnelId);
	expect(tunnel).toBeUndefined();
	debugTests("[TEST] Tunnel is deleted");
}

test("create a new static IP tunnel with both UDP and TCP ports and wait for allocation", async () => {
	const randomPort = generateRandomPort();
	const tunnel = await playit.agents.capaodocorvo_srv.createTunnel({
		name: "Test Static IP Tunnel",
		config: { fields: [{ name: "local_ip", value: "127.0.0.1" }] },
		endpoint: {
			type: "dedicated-ip",
			details: {
				ip_hostname: playit.allocations["195_ip_sa_ply_gg"].ip_hostname,
				port: randomPort,
			},
		},
		protocol: {
			type: "raw-ports",
			details: { port_type: "both", port_count: 1, software_description: "Webserver API Tunnel" },
		},
	});

	expect(tunnel).toBeDefined();
	expect(z.uuidv4().safeParse(tunnel.id).success).toBeTrue();
	expect(tunnel.port_type).toBe("both");
	expect(tunnel.port_count).toBe(1);
	expect(tunnel.public_allocations.length).toBeGreaterThan(0);

	const portAlloc = tunnel.public_allocations.find(a => a.type === "PortAllocation");
	expect(portAlloc).toBeDefined();
	if (portAlloc?.type === "PortAllocation") {
		expect(portAlloc.details.ip_hostname).toBe(playit.allocations["195_ip_sa_ply_gg"].ip_hostname);
		expect(portAlloc.details.port).toBe(randomPort);
		expect(portAlloc.details.ip_region).toBe("south-america");
	}

	debugTests("[TEST] Tunnel created: ", tunnel);
	debugTests("[TEST] Deleting tunnel...");
	await assertTunnelIsDeleted(tunnel.id);
	debugTests("[TEST] Tunnel deleted");
}, { timeout: 5 * 60 * 1000 });

test("create a new region tunnel with both UDP and TCP ports and wait for allocation", async () => {
	const randomPort = generateRandomPort();
	const tunnel = await playit.agents.capaodocorvo_srv.createTunnel({
		name: "Test Region Tunnel",
		config: {
			fields: [
				{ name: "local_ip", value: "127.0.0.1" },
				{ name: "local_port", value: String(randomPort) },
			],
		},
		endpoint: {
			type: "region",
			details: { region: "south-america", port: null },
		},
		protocol: {
			type: "raw-ports",
			details: { port_type: "both", port_count: 1, software_description: "Main Website UI Tunnel" },
		},
	});

	expect(tunnel).toBeDefined();
	expect(z.uuidv4().safeParse(tunnel.id).success).toBeTrue();
	expect(tunnel.port_type).toBe("both");
	expect(tunnel.port_count).toBe(1);

	debugTests("[TEST] Tunnel created: ", tunnel);
	debugTests("[TEST] Deleting tunnel...");
	await assertTunnelIsDeleted(tunnel.id);
	debugTests("[TEST] Tunnel deleted");
}, { timeout: 5 * 60 * 1000 });

test("create a new dedicated IP application tunnel and wait for allocation", async () => {
	const randomPort = generateRandomPort();
	const tunnel = await playit.agents.capaodocorvo_srv.createTunnel({
		name: "Test MC Static IP Tunnel",
		config: { fields: [{ name: "local_ip", value: "127.0.0.1" }] },
		endpoint: {
			type: "dedicated-ip",
			details: {
				ip_hostname: playit.allocations["195_ip_sa_ply_gg"].ip_hostname,
				port: randomPort,
			},
		},
		protocol: {
			type: "tunnel-type",
			details: "minecraft-java",
		},
	});

	expect(tunnel).toBeDefined();
	expect(z.uuidv4().safeParse(tunnel.id).success).toBeTrue();
	expect(tunnel.tunnel_type).toBe("minecraft-java");
	expect(tunnel.public_allocations.length).toBeGreaterThan(0);

	const portAlloc = tunnel.public_allocations.find(a => a.type === "PortAllocation");
	expect(portAlloc).toBeDefined();
	if (portAlloc?.type === "PortAllocation") {
		expect(portAlloc.details.port).toBe(randomPort);
		expect(portAlloc.details.ip_region).toBe("south-america");
	}

	debugTests("[TEST] Tunnel created: ", tunnel);
	debugTests("[TEST] Deleting tunnel...");
	await assertTunnelIsDeleted(tunnel.id);
	debugTests("[TEST] Tunnel deleted");
}, { timeout: 5 * 60 * 1000 });

test("create a new region application tunnel and wait for allocation", async () => {
	const tunnel = await playit.agents.capaodocorvo_srv.createTunnel({
		name: "Test MC Region Tunnel",
		config: { fields: [{ name: "local_ip", value: "127.0.0.1" }] },
		endpoint: {
			type: "region",
			details: { region: "south-america", port: null },
		},
		protocol: {
			type: "tunnel-type",
			details: "minecraft-java",
		},
	});

	expect(tunnel).toBeDefined();
	expect(z.uuidv4().safeParse(tunnel.id).success).toBeTrue();
	expect(tunnel.tunnel_type).toBe("minecraft-java");
	expect(tunnel.public_allocations.length).toBeGreaterThan(0);

	debugTests("[TEST] Tunnel created: ", tunnel);
	debugTests("[TEST] Deleting tunnel...");
	await assertTunnelIsDeleted(tunnel.id);
	debugTests("[TEST] Tunnel deleted");
}, { timeout: 5 * 60 * 1000 });
