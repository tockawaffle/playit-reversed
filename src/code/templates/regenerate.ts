/**
 * Template regenerate function for code generation
 * 
 * IMPORTANT: This file is used as a template. The code here is validated
 * by TypeScript. The contents will be read and included in the generated
 * playit.ts file.
 */

import { spawn } from "child_process";

// ============ Regenerate ============

/**
 * Regenerate types by re-fetching from PlayIt API
 */
async function regenerate(): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn("bun", ["run", "playit:setup"], {
			stdio: "inherit",
			shell: true,
		});
		proc.on("close", (code) => {
			if (code === 0) {
				console.log("✓ Types regenerated. Restart your app to use the new types.");
				resolve();
			} else {
				reject(new Error(`Regeneration failed with code ${code}`));
			}
		});
		proc.on("error", reject);
	});
}

export { regenerate };

