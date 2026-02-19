/**
 * Re-export types derived from the API schema definitions
 */

import type z from "zod";
import type { accountOverviewOutputSchema } from "./code/main/bfetch/schemas/account-overview";
import type { agentsListOutputSchema } from "./code/main/bfetch/schemas/agents-list";
import type { allocationsListOutputSchema } from "./code/main/bfetch/schemas/allocations-list";
import type { tunnelsListOutputSchema } from "./code/main/bfetch/schemas/tunnels-list";

export type Agent = z.infer<typeof agentsListOutputSchema>["data"]["agents"][number];
export type AgentVersion = Agent["agent_version"];
export type AgentStatus = Agent["status"];
export type AgentStatusData = Agent["status"]["data"];
export type AgentRouting = Agent["routing"];

export type Tunnel = z.infer<typeof tunnelsListOutputSchema>["data"]["tunnels"][number];
export type TunnelOrigin = Tunnel["origin"];
export type TunnelOriginData = Tunnel["origin"]["details"];

export type IpAllocation = z.infer<typeof allocationsListOutputSchema>["data"]["ips"][number];

export type AccountData = { account: z.infer<typeof accountOverviewOutputSchema>["data"] };
