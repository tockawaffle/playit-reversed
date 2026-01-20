# PlayIt Reversed

A **type-safe API client** for [playit.gg](https://playit.gg) with code generation.

> **Disclaimer**: This is not an official library and is not endorsed by PlayIt. Use of this library may violate [PlayIt's Terms of Service](https://playit.gg/terms). This was created as an experiment to understand how PlayIt's API works. Please read the TOS before using.

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
2. Fetch all your agents and tunnels
3. Generate a `generated/playit.ts` file with fully typed data

### 2. Get your session token

1. Go to [playit.gg](https://playit.gg) and log in
2. Open DevTools (`F12`) → **Application** → **Cookies**
3. Copy the value of `__session`

### 3. Use the generated types

```typescript
import { playit } from "./generated/playit";

// Access agents (fully typed!)
const agent = playit.agents.my_server;
console.log(agent.id);       // "a86750f2-..."
console.log(agent.status);   // "connected"
console.log(agent.os);       // "linux"

// Each agent has its tunnels
for (const tunnel of agent.tunnels) {
    console.log(`${tunnel.name}: ${tunnel.alloc.assignedDomain}`);
}

// Access tunnels directly
const tunnel = playit.tunnels.SSH;
console.log(tunnel.origin.localPort);     // 22
console.log(tunnel.alloc.assignedDomain); // "xxx.with.playit.plus"
```

## API Reference

### Agents

Each agent has the following properties and methods:

```typescript
interface AgentRef {
    // Properties
    readonly id: AgentId;
    readonly name: AgentName;
    readonly clientIp: string;
    readonly tunnelIp: string;
    readonly version: string;
    readonly os: string;
    readonly status: string;
    readonly tunnels: TunnelRef[];

		// Works but only for dedicated IPs.
    createTunnel(options: CreateTunnelOptions): Promise<void>;
    // Methods (WIP - not yet implemented)
    delete(): Promise<void>;
    rename(newName: string): Promise<void>;
}
```

### Tunnels

Each tunnel has the following properties and methods:

```typescript
interface TunnelRef {
    // Properties
    readonly id: TunnelId;
    readonly name: TunnelName;
    readonly tunnelType: string | null;
    readonly portType: "tcp" | "udp" | "both";
    readonly portCount: number;
    readonly alloc: {
        readonly assignedDomain: string;
        readonly tunnelIp: string;
        readonly portStart: number;
        readonly portEnd: number;
        // ... more fields
    };
    readonly origin: {
        readonly agentId: AgentId;
        readonly agentName: AgentName;
        readonly localIp: string;
        readonly localPort: number;
    };
    readonly active: boolean;
    readonly region: string;

    // Methods (WIP - not yet implemented)
    delete(): Promise<void>;
    update(options: UpdateTunnelOptions): Promise<void>;
    enable(): Promise<void>;
    disable(): Promise<void>;
}
```

### Create Tunnel Options

```typescript
interface CreateTunnelOptions {
	description: string; // The description of the tunnel, needed for TCP/UDP/BOTH
	localPort: number; // The number of the port that will be used
	portType?: "tcp" | "udp" | "both";
	ipHostname?: AllocationKey; // The dedicated IP to be used
	tunnelType: "dedicated-ip" | "shared-ip" | "shared-port"; // The tunnel type that will be created
}
```

### Regenerating Types

When your PlayIt configuration changes (new agents, tunnels, etc.), regenerate the types:

```bash
npx playit-reversed@beta setup
```

Or programmatically:

```typescript
await playit.regenerate();
// Note: You may need to restart your app to use the new types
```

Note: If you create a tunnel or agent manually at the website, you will need to manually regenerate the types as currently there's no way for a third-party to receive these kind of updates.

## How It Works

1. **Setup** fetches HTML from `https://playit.gg/account/agents`
2. The page contains a **Remix context** with all your account data (agents + tunnels)
3. This data is parsed and used to generate a TypeScript file
4. The generated file contains:
   - Type definitions (`AgentId`, `TunnelId`, etc.)
   - Static data for all agents and tunnels
   - Action methods for CRUD operations

## Environment Variables

You can set your token via environment variable instead of the interactive prompt:

```bash
# .env
PLAYIT_API_KEY=your_session_token_here # Remove the "__session=" part of the token before setting it up.
```

## CLI Commands

```bash
# Initial setup (prompts for token, fetches data, generates types)
npx playit-reversed setup

# Regenerate types from cached data (no API call)
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

**Note**: Action methods (create, update, delete) are currently stubs that throw "Not implemented" errors. API integration is planned for future releases.
