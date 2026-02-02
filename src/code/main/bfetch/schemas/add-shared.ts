import z from "zod";
import { regionKeys, regionPremiumStatus } from "../../regions";
import { getAllTunnelTypes, getTunnelTypeConfig, isValidTunnelType, tunnelTypeKeys } from "../../tunnel-types";
import { allocationOutputSchema } from "./settings-allocations";

export default z.object({
	user: allocationOutputSchema.shape.state.shape.loaderData.shape["routes/account"].shape.overview,
	__csrf_token: z.string(),
	region: z.enum(regionKeys)
		.refine((value) => regionKeys.includes(value), { message: "Invalid region, must be one of: " + regionKeys.join(", ") }),
	tunnel_type: z.enum(tunnelTypeKeys).refine((value) => {
		return isValidTunnelType(value);
	}, { message: "Invalid tunnel type, must be one of: " + getAllTunnelTypes().join(", ") }),
	"tunnel-desc": z.string().optional(),
	port_count: z.number().optional(),
	local_port: z.number().positive(),
	enabled: z.enum(["on", "off"]),
	overridePort: z.boolean().optional(),
}).superRefine((data, ctx) => {
	// Check if user is using a premium region AND is an actual premium user
	if (regionPremiumStatus[data.region] && !data.user.has_premium) {
		ctx.addIssue({
			code: "custom",
			message: "You are using a premium region, but you are not a premium user. Please upgrade to a premium account to use this region.",
			path: ["region"],
		});
		return;
	}

	const isPortType = data.tunnel_type === "both" || data.tunnel_type === "tcp" || data.tunnel_type === "udp";

	if (
		data.local_port
		&& !isPortType
		&& data.overridePort
		&& isValidTunnelType(data.tunnel_type)
	) {
		const tunnelConfig = getTunnelTypeConfig(data.tunnel_type);
		if (!tunnelConfig) {
			ctx.addIssue({
				code: "custom",
				message: "Invalid tunnel type, must be one of: " + getAllTunnelTypes().join(", "),
				path: ["tunnel_type"],
			});
			return;
		}
		// Override the local port to the default port of the tunnel type
		data.local_port = tunnelConfig.defaultPort;
		// Override the port count to the port count of the tunnel type
		data.port_count = tunnelConfig.portCount;
		// Override the port type to the port type of the tunnel type
		data.tunnel_type = tunnelConfig.portType;
		// Override the enabled to on
		data.enabled = "on";
	}

	// Conditionally require fields for "both", "tcp", and "udp" tunnel types
	if (isPortType) {
		if (!data["tunnel-desc"]) {
			ctx.addIssue({
				code: "custom",
				message: "Tunnel description is required for 'both', 'tcp', and 'udp' tunnel types",
				path: ["tunnel-desc"],
			});
		}
		const badLocalPort = typeof data.local_port !== "number" || data.local_port < 1 || data.local_port > 65535;
		if (badLocalPort) {
			ctx.addIssue({ code: "custom", message: "Local port must be 1-65535", path: ["local_port"] });
		}
		const badPortCount = data.port_count == null || typeof data.port_count !== "number" || data.port_count < 1;
		if (badPortCount) {
			ctx.addIssue({ code: "custom", message: "Port count must be a positive number", path: ["port_count"] });
		}
	}
})