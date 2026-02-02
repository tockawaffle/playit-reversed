
import { createPlayItFetch } from "./code/main/bfetch";
import type { AccountData, Agent, IpAllocation as Allocation, Tunnel } from "./code/main/bfetch/schemas/settings-allocations";
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
		agents: Agent[];
		tunnels: Tunnel[];
		allocations: Allocation[];
		account: AccountData["account"];
	}> {
		// The allocations endpoint contains everything we need in one request
		const { data, error } = await this.$fetch("@get/account/settings/allocations");

		if (error) {
			throw new Error("Failed to fetch PlayIt data: " + error.message);
		}

		return {
			agents: data.state.loaderData["routes/account"].agents.agents,
			tunnels: data.state.loaderData["routes/account"].tunnels.tunnels,
			allocations: data.state.loaderData["routes/account/settings/allocations"].ips.filter((ip): ip is NonNullable<typeof ip> => ip !== undefined),
			account: { ...data.state.loaderData["routes/account"].overview, csrfToken: data.state.loaderData["routes/account"].csrfToken },
		}
	}
}
