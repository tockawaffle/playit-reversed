/**
 * Template loader for code generation
 * 
 * This module reads the template files and provides their contents
 * for inclusion in the generated output.
 */

import fs from "fs";
import path from "path";

const TEMPLATES_DIR = __dirname;

/**
 * Read a template file and return its contents
 */
function readTemplate(filename: string): string {
	const filePath = path.join(TEMPLATES_DIR, filename);
	return fs.readFileSync(filePath, "utf-8");
}

/**
 * Extract the content between markers or after imports
 * Removes the file header comment, imports, and export statements
 */
function extractContent(content: string, options: {
	removeImports?: boolean;
	removeExports?: boolean;
	removeHeaderComment?: boolean;
	removePlaceholderTypes?: boolean;
	removeForwardDeclarations?: boolean;
} = {}): string {
	let result = content;

	// Remove header comment (first block comment)
	if (options.removeHeaderComment !== false) {
		result = result.replace(/^\/\*\*[\s\S]*?\*\/\s*\n?/, "");
	}

	// Remove import statements (single line and multi-line)
	if (options.removeImports !== false) {
		// Multi-line imports
		result = result.replace(/^import\s+(?:type\s+)?{[\s\S]*?}\s+from\s+["'][^"']+["'];?\s*\n?/gm, "");
		// Single line imports
		result = result.replace(/^import\s+.*?from\s+["'][^"']+["'];?\s*\n?/gm, "");
	}

	// Remove placeholder type declarations and their comment
	if (options.removePlaceholderTypes !== false) {
		result = result.replace(/\/\/\s*Placeholder types[^\n]*\n(?:type\s+\w+\s*=\s*string;\s*\n?)*/g, "");
	}

	// Remove forward declarations and their comment
	if (options.removeForwardDeclarations !== false) {
		result = result.replace(/\/\/\s*Forward declarations[^\n]*\n(?:declare function[^\n]*\n)*/g, "");
	}

	// Remove export statements at the end
	if (options.removeExports !== false) {
		result = result.replace(/\/\/\s*Export for validation\s*\n?/g, "");
		result = result.replace(/^export\s*{[\s\S]*?};\s*\n?$/gm, "");
		result = result.replace(/^export\s+{[\s\S]*?}\s+from[\s\S]*?;\s*\n?$/gm, "");
		result = result.replace(/^export\s+type\s*{[\s\S]*?}\s+from[\s\S]*?;\s*\n?$/gm, "");
	}

	// Clean up multiple blank lines
	result = result.replace(/\n{3,}/g, "\n\n");

	return result.trim();
}

/**
 * Get the types template content (for types.ts generation)
 * 
 * Instead of including raw template code with z.infer references,
 * emit clean re-exports from the playit-reversed package.
 * The types are still validated at compile time via the template files.
 */
export function getTypesTemplate(): string {
	return `import type {
	AllocationResult,
	CreateTunnelOptions,
	UpdateTunnelOptions,
	TunnelRef,
	TunnelRefById,
	AgentRef,
	AgentRefById,
	PlayitResponse,
	TunnelData,
	AgentData,
	AllocationData,
	AccountData,
} from "playit-reversed";

export type {
	AllocationResult,
	CreateTunnelOptions,
	UpdateTunnelOptions,
	TunnelRef,
	TunnelRefById,
	AgentRef,
	AgentRefById,
	PlayitResponse,
	TunnelData,
	AgentData,
	AllocationData,
	AccountData,
};`;
}

/**
 * Get the actions import statement for the generated file
 * Imports from the package name so it works when installed from npm
 */
export function getActionsImport(): string {
	return `import {
	deleteTunnel,
	updateTunnel,
	enableTunnel,
	disableTunnel,
	deleteAgent,
	renameAgent,
	CreateTunnel as createTunnel,
	GetTunnels,
	GetTunnel,
} from "playit-reversed";`;
}

/**
 * Get the factory functions template content (for playit.ts generation)
 */
export function getFactoryTemplate(): string {
	const content = readTemplate("factory.ts");
	return extractContent(content);
}

/**
 * Get the regenerate function template content (for playit.ts generation)
 */
export function getRegenerateTemplate(): string {
	const content = readTemplate("regenerate.ts");
	return extractContent(content);
}

/**
 * Get the import statements for the generated file header
 */
export function getHeaderImports(): string {
	return `import { spawn } from "child_process";

import type {
	AgentData,
	AgentId,
	AgentKey,
	AgentName,
	AgentRef,
	AgentRefById,
	AllocationData,
	AllocationKey,
	CreateTunnelOptions,
	PlayitResponse,
	TunnelData,
	TunnelId,
	TunnelKey,
	TunnelName,
	TunnelRef,
	TunnelRefById,
	UpdateTunnelOptions,
} from "./types";`;
}
