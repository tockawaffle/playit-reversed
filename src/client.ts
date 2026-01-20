import { createFetch, type BetterFetch } from "@better-fetch/fetch";
import { requireCodegen } from "./guard";
import { parsePlayItHtml } from "./parsers";
import { playitSchema } from "./schemas";
import type { PlayItData, PlayItOptions } from "./types";

const DEFAULT_HEADERS = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"Accept-Language": "en-US,en;q=0.9",
	"Cache-Control": "max-age=0",
	"Sec-Ch-Ua-Platform": "Windows",
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "same-origin",
	"Sec-Fetch-User": "?1",
	"Sec-Gpc": "1",
	"Upgrade-Insecure-Requests": "1",
	"Priority": "u=0, i",
} as const;

/**
 * PlayIt.gg API client
 * 
 * This is an internal client used by the CLI for fetching data.
 * Users should use the generated `playit` object instead.
 */
export class PlayIt<
	TAgentId extends string = string,
	TAgentName extends string = string
> {
	private baseUrl = "https://playit.gg";
	private authorizationToken: string;
	private $fetch: BetterFetch;

	private constructor(options: PlayItOptions = {}) {
		const { authorizationToken, baseUrl } = options;
		const token = "__session=" + (authorizationToken || process.env.PLAYIT_API_KEY);

		if (!token || token === "__session=undefined") {
			throw new Error("PLAYIT_API_KEY is not set or is invalid");
		}

		this.authorizationToken = token;
		this.baseUrl = baseUrl || this.baseUrl;

		this.$fetch = createFetch({
			baseURL: this.baseUrl,
			headers: {
				"Cookie": this.authorizationToken,
				...DEFAULT_HEADERS,
			},
			schema: playitSchema
		});
	}

	/**
	 * Create a new PlayIt client instance
	 * 
	 * @internal This is used by the CLI. Users should use the generated `playit` object.
	 */
	static create<
		TAgentId extends string = string,
		TAgentName extends string = string
	>(options: PlayItOptions & { _skipCodegenCheck?: boolean } = {}): PlayIt<TAgentId, TAgentName> {
		// Ensure codegen has been run (skip for internal CLI usage)
		if (!options._skipCodegenCheck) {
			requireCodegen();
		}

		return new PlayIt<TAgentId, TAgentName>(options);
	}

	/**
	 * Fetch all data from PlayIt (agents + tunnels + allocations) in a single request
	 * 
	 * Uses /account/settings/allocations which contains all account data including:
	 * - routes/account (agents + tunnels)
	 * - routes/account/settings/allocations (IP allocations)
	 */
	async fetchAll(): Promise<PlayItData> {
		// The allocations endpoint contains everything we need in one request
		const { data, error } = await this.$fetch("/account/settings/allocations");

		if (error) {
			throw new Error("Failed to fetch PlayIt data: " + error.message);
		}

		return parsePlayItHtml(data as string);
	}
}
