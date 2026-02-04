/**
 * Template for action imports in the generated file
 * 
 * Actions are implemented in src/code/actions.ts and exported from the main
 * package entry point (src/index.ts). The generated code imports them from
 * the package name "playit-reversed" so it works when installed from npm.
 * 
 * This file exists for documentation and to validate that the exports exist.
 */

// Validate that these exports exist in the main package
export * from "../actions";

// Re-export types for template validation
export type { CreateStaticIpTunnelOptions, UpdateTunnelOptions } from "./types";
