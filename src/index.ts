import "dotenv/config";

// Main client (internal, used by CLI)
export { PlayIt as default, PlayIt } from "./client";

// Types
export type { Agent, PlayItData, PlayItOptions, Tunnel, TunnelAlloc, TunnelOrigin } from "./types";

// Parsers (for advanced usage)
export { parseAgentsHtml, parsePlayItHtml, parseTunnelsHtml } from "./parsers";

// Codegen guard
export { CodegenRequiredError, isCodegenComplete, requireCodegen } from "./guard";

