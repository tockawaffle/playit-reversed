import fs from "fs";
import path from "path";

const GENERATED_FILE = "generated/playit.ts";

export class CodegenRequiredError extends Error {
	constructor() {
		super(
			`\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
			`  PlayIt codegen not found!\n` +
			`\n` +
			`  Run the following command first:\n` +
			`\n` +
			`    bun run playit:setup\n` +
			`\n` +
			`  This will fetch your agents and generate the required types.\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
		);
		this.name = "CodegenRequiredError";
	}
}

/**
 * Check if codegen has been run
 */
export function isCodegenComplete(): boolean {
	const generatedPath = path.resolve(GENERATED_FILE);
	return fs.existsSync(generatedPath);
}

/**
 * Throw an error if codegen hasn't been run
 */
export function requireCodegen(): void {
	if (!isCodegenComplete()) {
		throw new CodegenRequiredError();
	}
}

/**
 * Assert codegen is complete (call this at module load time)
 */
export function assertCodegen(): void {
	requireCodegen();
}
