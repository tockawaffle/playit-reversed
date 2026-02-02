# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Dates are using the NORMAL format of DD-MM-YYYY.

## [0.1.0-beta.6.0.0] - 02-02-2026

### Added
- **Subpath export** `playit-reversed/actions` in `package.json` for action implementations (`createStaticIpTunnel`, `deleteAgent`, `deleteTunnel`, `disableTunnel`, `enableTunnel`, `renameAgent`, `updateTunnel`).
- **Exports from main package**: `AllocationResult` type, `regionKeys` from `./code/main/regions`, and all schema types via `export type * from "./code/main/bfetch/schemas/settings-allocations"` (e.g. `AccountData`, `Agent`, `AgentRouting`, `AgentStatus`, `AgentStatusData`, `AgentVersion`, `Firewalls`, `IpAllocation`, `Overview`, `Session`, `TcpAlloc`, `Tunnel`, `TunnelAlloc`, `TunnelAllocAssignment`, `TunnelAllocData`, `TunnelOrigin`, `TunnelOriginData`, `TunnelRatelimit`, `UdpAlloc`).
- **Operating by ID**: `playit.tunnel(id)` and `playit.agent(id)` return refs with the same action methods as codegen-backed refs; before each action the library fetches the current list of tunnels/agents to validate the ID.
- **Codegen**: Generated `user.ts` with account data satisfying `AccountData["account"]`; `playit.regenerate()`; factory helpers `createTunnelRefById`, `createAgentRefById`; codegen driven by templates in `src/code/templates/` (imports, types, factory, regenerate, actions).
- **CLI**: Validates stored data with `allocationOutputSchema` (Zod) before regenerate; saves and uses `account` (overview + `csrfToken`) in `playit-data.json`; outputs `playit.ts`, `types.ts`, and `user.ts`.
- **Tunnel alloc**: Codegen supports `alloc.status === "disabled"` with `reason` in addition to allocated/pending/unallocated.
- **DevDependency**: Self-referential `playit-reversed` from local `.tgz` for testing.

### Changed
- **PlayIt client** (`src/client.ts`): Uses `createPlayItFetch()` (bfetch) instead of `createFetch` + HTML; no generic type parameters (`PlayIt<TAgentId, TAgentName>` removed); constructor/`create` options inlined as `{ authorizationToken?, baseUrl?, _skipCodegenCheck? }`.
- **`fetchAll()`**: Returns typed loader data: `agents`, `tunnels`, `allocations` from API shape (snake_case schema), and `account: { ...overview, csrfToken }`; no HTML or Remix context parsing.
- **Types** (`src/types.ts`): Now only re-exports from `./code/main/bfetch/schemas/settings-allocations`; legacy entity types removed.
- **Codegen** (`src/code/generic.ts`): Uses schema types (`AccountData`, `Agent`, `IpAllocation`, `Tunnel` from settings-allocations); `CodegenConfig.user` is `AccountData["account"]`; imports from `./templates/index` (header, actions, types, factory, regenerate); tunnel/agent instances built with `createTunnelRef`/`createAgentRef` and `config.user.csrfToken`; generated `playit` object includes `tunnel(id)`, `agent(id)`, `regenerate`.
- **CLI** (`src/cli.ts`): Uses schema types and `allocationOutputSchema` for validation; consumes `fetchAll()` result with snake_case (`t.origin.data.agent_id`, `t.alloc.data`, etc.); stored data includes `account` and `updatedAt`; duplicate tunnel/allocation names get indexed keys (`_2`, `_3`, …).
- **tsconfig.json**: Explicit `include: ["src/**/*"]`; `exclude` set to `generated`, `examples`, `dist`, `node_modules` (no globs).

### Removed
- **Parsers**: `src/parsers/index.ts`, `src/parsers/agents.ts`; exports `parseAgentsHtml`, `parsePlayItHtml`, `parseTunnelsHtml` and Remix/HTML parsing. (Not really removed but improved.)
- **Legacy types**: Entire file `src/code/types.ts`; from `src/types.ts`: `Agent`, `AllocatedTunnelAlloc`, `PendingTunnelAlloc`, `UnallocatedTunnelAlloc`, `TunnelOrigin`, `Tunnel`, `Allocation`, `PlayItOptions`, `PlayItData`, etc.
- **Exports**: Parser functions and old type names no longer re-exported from main `src/index.ts`.
- **File**: `src/code/index.ts` (deleted).

## [0.1.0-beta.5.0.2] - 26-01-2026

### Changed
- Split code generation into two separate files: `playit.ts` (implementation) and `types.ts` (type definitions)
- Refactored `src/code/types.ts` to use plain TypeScript types instead of Zod schemas
- Updated imports to use the new separate types file structure
- Exported `TunnelData` interface for external use

### Thoughts
- May God guide my hand while doing this, because I don't even know what is happening anymore.
- It works tho, so it's fine (for now)

## [0.1.0-beta.5.0.0] - 26-01-2026

### Added
- DEBUG environment variable support for logging (using `debug` package)
  - Enable all logs with `DEBUG=playit:*`
  - Enable specific namespaces like `DEBUG=playit:createStaticIpTunnel`
- `regenerate` option to `CreateTunnelOptions` interface for automatic type regeneration after tunnel creation
- Tunnel creation implementation (`createStaticIpTunnel`) for dedicated IP tunnels
- Discriminated union types for tunnel allocations (`AllocatedTunnelAlloc`, `PendingTunnelAlloc`, `UnallocatedTunnelAlloc`)
- Repository field in `package.json`
- New dependencies: `debug` and `uuid`

### Changed
- Refactored code generation to use modular `generateGenericCode` function
- Improved tunnel allocation handling with proper discriminated unions based on status
- Updated documentation note: `create` method is now implemented (update/delete remain stubs)
- Better handling of nullable `local_port` values in tunnel origin data

### Fixed
- Proper type safety for tunnel allocation statuses (allocated, pending, unallocated)
- Handling of null `local_port` values in tunnel parsing

### Thoughts

- This is a messy, unorganized project with types that are literally everywhere and sometimes conflict with each other. But it works and that's what I actually care.