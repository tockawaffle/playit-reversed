import z from "zod";
import { regionKeys, regionPremiumStatus } from "../../regions";
import { getAllTunnelTypes, isValidTunnelType, tunnelTypeKeys } from "../../tunnel-types";
import { allocationOutputSchema } from "./settings-allocations";

const addSharedSchema = z.object({
	user: allocationOutputSchema.shape.state.shape.loaderData.shape["routes/account"].shape.overview,
	__csrf_token: z.string(),
	region: z.enum(regionKeys)
		.refine((value) => regionKeys.includes(value), { message: "Invalid region, must be one of: " + regionKeys.join(", ") }),
	tunnel_type: z.enum(tunnelTypeKeys).refine((value) => {
		return isValidTunnelType(value);
	}, { message: "Invalid tunnel type, must be one of: " + getAllTunnelTypes().join(", ") }),
	"tunnel-desc": z.string().optional(),
	port_count: z.number().optional(),
	local_port: z.number().positive().optional(),
	enabled: z.enum(["on", "off"]),
}).superRefine((data, ctx) => {
	// Check if user is using a premium region AND is an actual premium user
	if (regionPremiumStatus[data.region] && !data.user.has_premium) {
		ctx.addIssue({
			code: "custom",
			message: "You are using a premium region, but you are not a premium user. Please upgrade to a premium account to use this region. If you bought a premium account, regenerate the types to get the latest user data.",
			path: ["user", "has_premium"],
		});
		return;
	}

	const isPortType = data.tunnel_type === "both" || data.tunnel_type === "tcp" || data.tunnel_type === "udp";

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

export type AddSharedSchemaBody = z.infer<typeof addSharedSchema>;
export default addSharedSchema;