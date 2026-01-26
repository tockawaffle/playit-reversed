# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Dates are using the NORMAL format of DD-MM-YYYY.

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