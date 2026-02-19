
import type z from "zod";
import { createPlayItFetch } from "./code/main/bfetch";
import type { accountOverviewOutputSchema } from "./code/main/bfetch/schemas/account-overview";
import type { agentsListOutputSchema } from "./code/main/bfetch/schemas/agents-list";
import type { allocationsListOutputSchema } from "./code/main/bfetch/schemas/allocations-list";
import type { tunnelsListOutputSchema } from "./code/main/bfetch/schemas/tunnels-list";
import { requireCodegen } from "./guard";

/**
 * PlayIt.gg API client
 * 
 * This is an internal client used by the CLI for fetching data.
 * Users should use the generated `playit` object instead.
 */
export class PlayIt {
	private baseUrl = "https://playit.gg";
	private $fetch: ReturnType<typeof createPlayItFetch>;

	private constructor(options: { authorizationToken?: string, baseUrl?: string } = {}) {
		const { authorizationToken, baseUrl } = options;
		const token = "__session=" + (authorizationToken || process.env.PLAYIT_API_KEY);

		if (!token || token === "__session=undefined") {
			throw new Error("PLAYIT_API_KEY is not set or is invalid");
		}

		this.baseUrl = baseUrl || this.baseUrl;

		this.$fetch = createPlayItFetch();
	}

	/**
	 * Create a new PlayIt client instance
	 * 
	 * @internal This is used by the CLI. Users should use the generated `playit` object.
	 */
	static create(options: { authorizationToken?: string, baseUrl?: string, _skipCodegenCheck?: boolean } = {}): PlayIt {
		// Ensure codegen has been run (skip for internal CLI usage)
		if (!options._skipCodegenCheck) {
			requireCodegen();
		}

		return new PlayIt(options);
	}

	/**
	 * Fetch all data from PlayIt (agents + tunnels + allocations) in a single request
	 * 
	 * Uses /account/settings/allocations which contains all account data including:
	 * - routes/account (agents + tunnels)
	 * - routes/account/settings/allocations (IP allocations)
	 */
	async fetchAll(): Promise<{
		agents: z.infer<typeof agentsListOutputSchema>["data"]["agents"];
		tunnels: z.infer<typeof tunnelsListOutputSchema>["data"]["tunnels"];
		allocations: z.infer<typeof allocationsListOutputSchema>["data"]["ips"];
		account: z.infer<typeof accountOverviewOutputSchema>["data"];
	}> {
		const [agentsRes, tunnelsRes, allocationsRes, accountRes] = await Promise.all([
			this.$fetch("@post/agents/list"),
			this.$fetch("@post/v1/tunnels/list"),
			this.$fetch("@post/allocations/list", { body: { alloc_id: null } }),
			this.$fetch("@post/account/overview"),
		]);

		if (agentsRes.error) throw new Error("Failed to fetch agents: " + agentsRes.error.message);
		if (tunnelsRes.error) throw new Error("Failed to fetch tunnels: " + tunnelsRes.error.message);
		if (allocationsRes.error) throw new Error("Failed to fetch allocations: " + allocationsRes.error.message);
		if (accountRes.error) throw new Error("Failed to fetch account: " + accountRes.error.message);

		return {
			agents: agentsRes.data.data.agents,
			tunnels: tunnelsRes.data.data.tunnels,
			allocations: allocationsRes.data.data.ips,
			account: accountRes.data.data,
		};
	}
}
