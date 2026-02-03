# PlayIt Reversed

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
> - **Security**: This library requires your session token (`__session` cookie). **Never share your token** or commit it to version control. Store it securely using environment variables. This token also rotates in X days, so expect errors after X days to pop up. These kind of errors are also tricky, please be aware that the API might return a 200 status code even if your token is invalid. We do not handle these cases.
> - **Rate Limiting**: This project does not attempt to bypass any limitations set by PlayIt's website or API. All rate limits, validation errors, and rejections will be passed through to you and are not handled gracefully.
> - **Reverse Engineering**: This library works by reverse engineering PlayIt's web interface. This approach is fragile and may violate PlayIt's Terms of Service.
> - **No Support**: This is an experimental project. There is no official support channel, and issues may not be addressed promptly.
> - **Liability**: By using this library, you accept all risks and agree that the authors, contributors, and maintainers are not liable for any damages, data loss, account bans, or other consequences resulting from the use of this software.
> - **Removal Policy**: If PlayIt requests removal of this project, it will be immediately removed from NPM and made private on GitHub without any further notice from the authors. The project may be discontinued at any time at the authors' discretion or upon request from PlayIt.
> - **PlayIt Beta Website Notice**: Development will also target the PlayIt beta website. However, as a solo maintainer, there may be delays and occasional issues due to the need to frequently switch between versions for testing.
> 
> **Use at your own risk.**

## Features

- **Fully typed** - All agents and tunnels are statically typed
- **Code generation** - Types are generated from your actual PlayIt data
- **Single request** - Fetches all agents and tunnels in one API call
- **Zero runtime overhead** - Generated types are plain objects with methods
- **Action methods** - Create, update, delete tunnels and agents (WIP)

## Installation

```bash
# npm
npm install playit-reversed@beta

# bun
bun add playit-reversed@beta

# pnpm
pnpm add playit-reversed@beta
```

## Quick Start

### 1. Run the setup

```bash
npx playit-reversed@beta setup
```

This will:
1. Prompt for your PlayIt session token (from browser cookies)
2. Fetch all your agents and tunnels from the PlayIt API
3. Generate `generated/playit.ts`, `generated/types.ts`, and `generated/user.ts` with fully typed data and account info (including CSRF token for actions)

### 2. Get your session token

1. Go to [playit.gg](https://playit.gg) and log in
2. Open DevTools (`F12`) → **Application** → **Cookies**
3. Copy the value of `__session`

### 3. Use the generated API

```typescript
import { playit } from "./generated/playit";
import { user } from "./generated/user";
import { AccountData } from "playit-reversed";

// Access agents (fully typed — keys are derived from agent names, e.g. my_server)
const agent = playit.agents.my_server;
console.log(agent.id);       // "a86750f2-..."
console.log(agent.status);   // "connected"
console.log(agent.os);       // "linux"

// Each agent has its tunnels
for (const tunnel of agent.tunnels) {
    console.log(`${tunnel.name}: ${tunnel.alloc.assignedDomain}`);
}

// Access tunnels directly (keys derived from tunnel names, e.g. SSH, Minecraft_Java)
const tunnel = playit.tunnels.SSH;
console.log(tunnel.origin.localPort);     // 22
console.log(tunnel.alloc.assignedDomain); // "xxx.with.playit.plus"

// Create a dedicated IP tunnel (TCP)
await agent.createStaticIpTunnel(
	{
		dedicated_ip: playit.allocations["some_ip"].ipHostname,
		__csrf_token: user.csrfToken,
		public_port: 22,
		enabled: "on",
		tunnel_type: "tcp",
		"tunnel-desc": "SSH",
		port_count: 1,
	},
	true,  // waitForAllocation
	false  // waitForAllocatedStatus
);

// Create a region tunnel (port-based: TCP/UDP/both)
await agent.createRegionTunnel(
	{
		user: user as AccountData["account"],
		csrfToken: user.csrfToken,
		region: "north-america",  // or "europe", "asia", "global", etc.
		tunnelType: "both",       // "tcp", "udp", or "both"
		tunnelCreationReason: "Game Server",
		localPort: 7777,
		portCount: 2,
	},
	true,  // waitForAllocation
	false  // waitForAllocatedStatus
);

// Create a region tunnel (application-specific: e.g., Terraria, Minecraft)
await agent.createRegionTunnel(
	{
		user: user as AccountData["account"],
		csrfToken: user.csrfToken,
		region: "europe",
		tunnelType: "terraria",  // or "minecraft", etc.
	},
	true,  // waitForAllocation
	false  // waitForAllocatedStatus
);
```

### Operating by ID (tunnels and agents not in codegen)

When you have a tunnel or agent **by ID only** (e.g. newly created, or from another source), use `playit.tunnel(id)` and `playit.agent(id)` to get a minimal ref with the same action methods:

```typescript
// Tunnel by ID (e.g. created via createStaticIpTunnel, not yet in generated types)
const tunnelRef = playit.tunnel("some-tunnel-uuid");
await tunnelRef.delete();
await tunnelRef.update({ name: "New Name", localPort: 8080 });
await tunnelRef.enable();  // WIP: may throw "Not implemented"
await tunnelRef.disable(); // WIP: may throw "Not implemented"

// Agent by ID
const agentRef = playit.agent("some-agent-uuid");
await agentRef.rename("new-name");                    // WIP: may throw "Not implemented"
await agentRef.createStaticIpTunnel(options, true, false);
await agentRef.createRegionTunnel(regionOptions, true, false);
await agentRef.delete();                             // WIP: may throw "Not implemented"
```

> **Warning — Validation before actions**  
> Before running any action (delete, update, enable, disable, rename, etc.), the library **fetches the current list of tunnels and agents** from the API to verify that the ID you passed exists and belongs to your account. If the ID is invalid or no longer available, the action will not be performed and you will get an error instead of a failed API call. This extra request happens for each action when using `playit.tunnel(id)` or `playit.agent(id)`.

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

| Property / method     | Description                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `playit.agents`       | Record of all agents (key = identifier from name, e.g. `my_server`). Each value is an `AgentRef`.            |
| `playit.tunnels`      | Record of all tunnels (key = identifier from name). Each value is a `TunnelRef`.                             |
| `playit.allocations`  | Record of all IP allocations (key = identifier from hostname). Use for `dedicated_ip` when creating tunnels. |
| `playit.tunnel(id)`   | Returns a minimal `TunnelRef` by ID (for tunnels not in codegen).                                            |
| `playit.agent(id)`    | Returns a minimal `AgentRef` by ID (for agents not in codegen).                                              |
| `playit.agentIds`     | Array of all agent IDs.                                                                                      |
| `playit.agentNames`   | Array of all agent names.                                                                                    |
| `playit.tunnelIds`    | Array of all tunnel IDs.                                                                                     |
| `playit.tunnelNames`  | Array of all tunnel names.                                                                                   |
| `playit.regenerate()` | Re-runs setup (fetch + codegen). Does not work in serverless.                                                |

**AgentRef** (from `./generated/types`): `id`, `name`, `clientIp?`, `tunnelIp?`, `version`, `os`, `status`, `tunnels` (array of `TunnelRef`); methods: `createStaticIpTunnel(options, waitForAllocation, waitForAllocatedStatus)`, `createRegionTunnel(options, waitForAllocation, waitForAllocatedStatus)`, `delete()`, `rename(newName)`.

**TunnelRef**: tunnel data (`id`, `name`, `tunnelType`, `portType`, `portCount`, `alloc`, `origin`, `domain`, etc.); methods: `delete()`, `update({ name?, localPort?, localIp? })`, `enable()`, `disable()`.

**CreateStaticIpTunnelOptions** (for TCP/UDP/both): `dedicated_ip` (allocation hostname), `__csrf_token` (from `user.csrfToken` in `./generated/user`), `public_port`, `enabled: "on" | "off"`, `tunnel_type: "tcp" | "udp" | "both"`, `"tunnel-desc": string`, `port_count: number`. For other tunnel types (e.g. Minecraft), see `CreateStaticIpTunnelOptions` in `./generated/types`.

**CreateRegionTunnelOptions**: Discriminated union type for creating region-based tunnels. Common fields: `user` (from `AccountData["account"]`), `csrfToken` (from `user.csrfToken`), `region` (e.g., `"north-america"`, `"europe"`, `"asia"`, `"global"`). For port-based tunnels (`tunnelType: "tcp" | "udp" | "both"`): also requires `tunnelCreationReason`, `localPort`, `portCount`. For application-specific tunnels (e.g., `tunnelType: "terraria"`, `"minecraft"`): no additional fields required. See `CreateRegionTunnelOptions` and `RegionValue` in `./generated/types` and exported from `playit-reversed`.

## How It Works

1. **Setup** calls the PlayIt API endpoint `@get/account/settings/allocations` (via bfetch), which returns JSON with loader data for routes/account (agents + tunnels) and routes/account/settings/allocations (IP allocations).
2. The response is validated with Zod schemas and stored in `generated/playit-data.json` (including account overview and CSRF token).
3. Codegen reads this data and generates `generated/playit.ts`, `generated/types.ts`, and `generated/user.ts`.
4. The generated files contain type definitions (`AgentId`, `TunnelId`, `TunnelKey`, `AllocationKey`, etc.), static instances for all agents and tunnels, and action methods that call `playit-reversed` (e.g. `createStaticIpTunnel`, `deleteTunnel`, `updateTunnel`).

## Environment Variables

You can set your token via environment variable instead of the interactive prompt:

```bash
# .env
PLAYIT_API_KEY=your_session_token_here # Remove the "__session=" part of the token before setting it up.
```

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

---

**Note**: Some action methods (e.g. tunnel delete/update/rename, createStaticIpTunnel) are implemented; others (e.g. enable/disable tunnel, agent delete/rename) are still WIP and may throw "Not implemented" until their API endpoints are integrated.
