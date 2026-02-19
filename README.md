# PlayIt Reversed

[![Build](https://github.com/tockawaffle/playit-reversed/actions/workflows/build.yml/badge.svg)](https://github.com/tockawaffle/playit-reversed/actions/workflows/build.yml)
[![Tests](https://github.com/tockawaffle/playit-reversed/actions/workflows/test.yml/badge.svg)](https://github.com/tockawaffle/playit-reversed/actions/workflows/test.yml)
[![Publish](https://github.com/tockawaffle/playit-reversed/actions/workflows/publish.yml/badge.svg)](https://github.com/tockawaffle/playit-reversed/actions/workflows/publish.yml)

A **type-safe API client** for [playit.gg](https://playit.gg) with code generation.

> **Disclaimer**: 
> 
> This is **not an official library** and is **not endorsed by PlayIt**. This project was created as an experiment to understand how PlayIt's API works through reverse engineering. Use of this library may violate [PlayIt's Terms of Service](https://playit.gg/terms) - **please read the TOS before using**.
> 
> **Important Warnings:**
> 
> - **Account Risk**: Misuse or misconfiguration may result in your PlayIt account being banned or suspended. The authors are not responsible for any consequences of using this library.
> - **No Warranty**: This library is provided "as-is" without any warranties or guarantees. It may break at any time due to changes in PlayIt's API or website structure.
> - **API Stability**: PlayIt's internal API is not documented and may change without notice. This library may stop working at any time and updates are not guaranteed.
> - **Security**: This library requires your session token ( `__Secure-WebAuth` cookie ). **Never share your token** or commit it to version control. Store it securely using environment variables. The library auto-rotates the `__Secure-WebAuth` cookie when the API issues a new one, but the token may still expire. Be aware that the API might return a 200 status code even if your token is invalid.
> - **Rate Limiting**: This project does not attempt to bypass any limitations set by PlayIt's website or API. All rate limits, validation errors, and rejections will be passed through to you and are not handled gracefully.
> - **Reverse Engineering**: This library works by reverse engineering PlayIt's web interface. This approach is fragile and may violate (PlayIt's Terms of Service)[https://playit.gg/terms].
> - **No Support**: This is an experimental project. There is no official support channel, and issues may not be addressed promptly.
> - **Liability**: By using this library, you accept all risks and agree that the authors, contributors, and maintainers are not liable for any damages, data loss, account bans, or other consequences resulting from the use of this software. By using this library you also agree with all (Playit's Terms of Service)[https://playit.gg/terms] and all other rules that could be applied from them.
> - **Removal Policy**: If PlayIt requests removal of this project, it will be immediately removed from NPM and made private on GitHub without any further notice from the authors. The project may be discontinued at any time at the authors' discretion or upon request from PlayIt.
> - **PlayIt Beta Website Notice**: Main development is now focused solely on what was previously the beta. You can still use the beta tag to target the old website and API, this, however, is not recommended.
> 
> **Use at your own risk.**

## Features

- **Fully typed** - All agents, tunnels, and allocations are statically typed
- **Code generation** - Types are generated from your actual PlayIt data
- **Parallel fetching** - Fetches agents, tunnels, allocations, and account info in parallel
- **Zero runtime overhead** - Generated types are plain objects with methods
- **Action methods** - Create, delete tunnels and agents; update/enable/disable (WIP)

## Installation

```bash
# npm
npm install playit-reversed

# bun
bun add playit-reversed

# pnpm
pnpm add playit-reversed
```

## Quick Start

### 1. Run the setup

```bash
npx playit-reversed setup
```

This will:
1. Prompt for your PlayIt session token (from browser cookies)
2. Fetch all your agents, tunnels, allocations, and account info from the PlayIt API (in parallel)
3. Generate `generated/playit.ts`, `generated/types.ts`, and `generated/user.ts` with fully typed data and account info as a snapshot for better initial usage.

### 2. Get your session token

1. Go to [playit.gg](https://playit.gg) and log in
2. Open DevTools (`F12`) → **Application** → **Cookies**
3. Copy the value of `__session`

### 3. Use the generated API

```typescript
import { playit } from "./generated/playit";

// Access agents (fully typed — keys are derived from agent names, e.g. my_server)
const agent = playit.agents.my_server;
console.log(agent.id);              // "a86750f2-..."
console.log(agent.status.state);    // "connected"

// Each agent has its tunnels
for (const tunnel of agent.tunnels) {
    const addr = tunnel.connect_addresses[0]?.value.address;
    console.log(`${tunnel.name}: ${addr}`);
}

// Access tunnels directly (keys derived from tunnel names, e.g. SSH, Minecraft_Java)
const tunnel = playit.tunnels.SSH;
console.log(tunnel.port_type);  // "tcp"
console.log(tunnel.public_allocations[0]?.details); // { ip_hostname, port, ... }

// Create a dedicated IP tunnel (raw ports: TCP/UDP/both)
const newTunnel = await agent.createTunnel({
    name: "SSH Tunnel",
    config: { fields: [{ name: "local_ip", value: "127.0.0.1" }] },
    endpoint: {
        type: "dedicated-ip",
        details: {
            ip_hostname: playit.allocations["some_ip"].ip_hostname,
            port: 22,
        },
    },
    protocol: {
        type: "raw-ports",
				// Note that "software_description" should be an actual description of what the tunnel is, else it could
				// lead to it not being created or even getting your account banned.
        details: { port_type: "tcp", port_count: 1, software_description: "SSH"  },
    },
});

// Create a region tunnel (raw ports: TCP/UDP/both)
await agent.createTunnel({
    name: "Game Server",
    config: {
        fields: [
            { name: "local_ip", value: "127.0.0.1" },
            { name: "local_port", value: "7777" },
        ],
    },
    endpoint: {
        type: "region",
        details: { region: "south-america", port: null },
    },
    protocol: {
        type: "raw-ports",
        details: { port_type: "both", port_count: 1, software_description: "Game Server" },
    },
});

// Create a region tunnel (application-specific: e.g., Minecraft, Terraria)
await agent.createTunnel({
    name: "MC Server",
    config: { fields: [{ name: "local_ip", value: "127.0.0.1" }] },
    endpoint: {
        type: "region",
        details: { region: "europe", port: null },
    },
    protocol: {
        type: "tunnel-type",
        details: "minecraft-java", // or "terraria", "valheim", etc.
    },
});
```

### Operating by ID (tunnels and agents not in codegen)

When you have a tunnel or agent **by ID only** (e.g. newly created, or from another source), use `playit.tunnel(id)` and `playit.agent(id)` to get a minimal ref with action methods:

```typescript
// Tunnel by ID
const tunnelRef = playit.tunnel("some-tunnel-uuid");
await tunnelRef.delete();
await tunnelRef.update({ name: "New Name", localPort: 8080 });
await tunnelRef.enable();  // WIP: may throw "Not implemented"
await tunnelRef.disable(); // WIP: may throw "Not implemented"

// Agent by ID
const agentRef = playit.agent("some-agent-uuid");
await agentRef.createTunnel({ name: "SSH", config: { ... }, endpoint: { ... }, protocol: { ... } });
await agentRef.rename("new-name"); // WIP: may throw "Not implemented"
await agentRef.delete();           // WIP: may throw "Not implemented"
```

### Fetching live data

```typescript
// Get all tunnels (live from API, not from codegen snapshot)
const allTunnels = await playit.getTunnels();

// Get a specific tunnel by ID
const tunnel = await playit.getTunnel("some-tunnel-uuid");
```

### Regenerating Types

When your PlayIt configuration changes (new agents, tunnels, etc.), regenerate the types:

```bash
npx playit-reversed@beta setup
```

Or programmatically:

```typescript
await playit.regenerate();
// Note: You may need to restart your app to use the new types. This does not work for serverless.
```

Note: If you create a tunnel or agent manually at the website, you will need to manually regenerate the types as currently there's no way for a third-party to receive these kind of updates.

You don't need to regenerate the types file every time you create a new tunnel; however, it's strongly recommended to save any relevant data from the new tunnel yourself so you can use it right away. This ensures your application can work with the tunnel immediately, even before regenerating types.

## API Reference

The generated `playit` object (from `./generated/playit`) exposes:

| Property / method      | Description                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `playit.agents`        | Record of all agents (key = identifier from name, e.g. `my_server`). Each value is an `AgentRef`.            |
| `playit.tunnels`       | Record of all tunnels (key = identifier from name). Each value is a `TunnelRef`.                             |
| `playit.allocations`   | Record of all IP allocations (key = identifier from hostname). Use for `dedicated_ip` when creating tunnels. |
| `playit.tunnel(id)`    | Returns a minimal `TunnelRefById` by ID (for tunnels not in codegen).                                        |
| `playit.agent(id)`     | Returns a minimal `AgentRefById` by ID (for agents not in codegen).                                          |
| `playit.getTunnels()`  | Fetches all tunnels live from the API.                                                                       |
| `playit.getTunnel(id)` | Fetches a single tunnel by ID live from the API.                                                             |
| `playit.agentIds`      | Array of all agent IDs.                                                                                      |
| `playit.agentNames`    | Array of all agent names.                                                                                    |
| `playit.tunnelIds`     | Array of all tunnel IDs.                                                                                     |
| `playit.tunnelNames`   | Array of all tunnel names.                                                                                   |
| `playit.regenerate()`  | Re-runs setup (fetch + codegen). Does not work in serverless.                                                |

**AgentRef**: `id`, `status` (`{ state, data }`), `tunnels` (array of `TunnelRef`), plus all agent fields from the API; methods: `createTunnel(options)`, `delete()`, `rename(newName)`.

**TunnelRef**: all tunnel fields from the API (`id`, `name`, `tunnel_type`, `port_type`, `port_count`, `origin`, `public_allocations`, `connect_addresses`, etc.); methods: `delete()`, `update({ name?, localPort?, localIp? })`, `enable()`, `disable()`.

**CreateTunnelOptions**: `name` (string), `config` (`{ fields: { name: "local_ip" | "local_port", value: string }[] }`), `endpoint` (either `{ type: "dedicated-ip", details: { ip_hostname, port } }` or `{ type: "region", details: { region, port } }`), `protocol` (either `{ type: "raw-ports", details: { port_type, port_count, software_description } }` or `{ type: "tunnel-type", details: GameTunnelType }`).

## How It Works

1. **Setup** calls multiple PlayIt API endpoints in parallel via bfetch (`agents/list`, `v1/tunnels/list`, `allocations/list`, `account/overview`).
2. Each response is validated with Zod schemas and the combined data is stored in `generated/playit-data.json`.
3. Codegen reads this data and generates `generated/playit.ts`, `generated/types.ts`, and `generated/user.ts`.
4. The generated files contain type definitions (`AgentId`, `TunnelId`, `TunnelKey`, `AllocationKey`, etc.), static instances for all agents and tunnels, and action methods that call `playit-reversed` (e.g. `createTunnel`, `deleteTunnel`, `updateTunnel`).

## Environment Variables

You can set your token via environment variable instead of the interactive prompt:

```bash
# .env
PLAYIT_SECURE_WEBAUTH=your_session_token_here
```

The library automatically rotates the `__Secure-WebAuth` cookie and updates the `.env` file when a new cookie is received from the API.

## CLI Commands

```bash
# Initial setup (prompts for token, fetches data, generates playit.ts, types.ts, user.ts)
npx playit-reversed setup

# Regenerate types from cached data in generated/playit-data.json (no API call)
npx playit-reversed generate
```

## Development

```bash
# Clone the repository
git clone https://github.com/tockawaffle/playit-reversed.git
cd playit-reversed

# Install dependencies
bun install

# Run setup locally
bun run playit:setup

# Build for publishing
bun run build
```

## Contributing

Contributions are welcome! If you encounter any issues or have suggestions, please:

1. Open an [issue](https://github.com/tockawaffle/playit-reversed/issues)
2. Submit a [pull request](https://github.com/tockawaffle/playit-reversed/pulls)

## License

MIT © [Cete](https://github.com/tockawaffle)

## Takedown / Removal

This project will be **immediately removed** from NPM and made private on GitHub upon a legitimate request from PlayIt's team.

If you are an authorized representative of PlayIt and wish to request removal of this project, please contact **report@tockanest.ch** with verifiable proof of your affiliation. Requests will be honored promptly and without dispute.

---

**Note**: Core action methods (`createTunnel`, `deleteTunnel`, `updateTunnel`) are implemented. Others (e.g. enable/disable tunnel, agent delete/rename) are still WIP and may throw "Not implemented" until their API endpoints are integrated.
