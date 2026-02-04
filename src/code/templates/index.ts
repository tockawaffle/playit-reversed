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
		// Remove the comment line and all type declarations that follow
		result = result.replace(/\/\/\s*Placeholder types[^\n]*\n(?:type\s+\w+\s*=\s*string;\s*\n?)*/g, "");
	}

	// Remove forward declarations and their comment
	if (options.removeForwardDeclarations !== false) {
		// Remove the comment line and all declare function statements that follow
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
 */
export function getTypesTemplate(): string {
	const content = readTemplate("types.ts");
	// Keep the placeholder types section header but remove actual placeholder definitions
	// They will be replaced with actual union types
	let result = extractContent(content, {
		removeHeaderComment: true,
		removeImports: true,
		removeExports: true,
		removePlaceholderTypes: false, // Keep the section, we'll replace it
		removeForwardDeclarations: true,
	});

	// Remove the entire placeholder types section (will be replaced with actual types)
	result = result.replace(/\/\/\s*=+\s*Codegen Placeholder Types\s*=+[\s\S]*?(?=\/\/\s*=+\s*API Response Types)/, "");
	// Add the new imports for the types at the top of the file
	result = `import type {
	AllocationResult,
	Agent as ApiAgent,
	IpAllocation as ApiIpAllocation,
	Tunnel as ApiTunnel,
	TunnelAllocData as ApiTunnelAllocData,
	TunnelOriginData as ApiTunnelOriginData,
	TunnelRatelimit as ApiTunnelRatelimit,
	RegionValue,
	AccountData
} from "playit-reversed";

export type { AllocationResult } from "playit-reversed";

` + result;

	return result;
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
	createRegionTunnel,
	createStaticIpTunnel,
	GetTunnels,
	GetTunnel,
	GetAvailableAllocations,
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
 * Get the imports template content (for playit.ts generation)
 */
export function getImportsTemplate(): string {
	const content = readTemplate("imports.ts");
	return extractContent(content, {
		removeImports: false
	});
}

/**
 * Get the import statements for the generated file header
 */
export function getHeaderImports(): string {
	return getImportsTemplate();
}
