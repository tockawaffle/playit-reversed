import Debug from "debug";
import z from "zod";
import { getAllTunnelTypes, getTunnelTypeConfig, isValidTunnelType, tunnelTypeKeys } from "../../tunnel-types";

const debugAddDedicatedIpSchema = Debug("playit:bfetch:schemas:add-dedicated-ip");

const addDedicatedIpSchema = {
	params: z.object({
		agentId: z.uuidv4(),
	}),
	/**
	 * @warning public_port is required for all tunnel types. When using "both", "tcp", or "udp", you must also provide tunnel-desc and port_count.
	 */
	body: z.object({
		_csrf_token: z.string(),
		dedicated_ip: z.string(),
		tunnel_type: z.enum(tunnelTypeKeys).refine((value) => {
			return isValidTunnelType(value);
		}, { message: "Invalid tunnel type, must be one of: " + getAllTunnelTypes().join(", ") }),
		"tunnel-desc": z.string().optional(),
		public_port: z.number(),
		port_count: z.number().optional(),
		enabled: z.enum(["on", "off"]),
		overridePort: z.boolean().optional(),
	}).superRefine((data, ctx) => {
		debugAddDedicatedIpSchema("Validating add dedicated IP schema with data: %O", data);
		debugAddDedicatedIpSchema("Validation context: %O", ctx);
		if (
			data.public_port
			&& !(data.tunnel_type === "both" || data.tunnel_type === "tcp" || data.tunnel_type === "udp")
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
			// Override the public port to the default port of the tunnel type
			data.public_port = tunnelConfig.defaultPort;
			// Override the port count to the port count of the tunnel type
			data.port_count = tunnelConfig.portCount;
			// Override the port type to the port type of the tunnel type
			data.tunnel_type = tunnelConfig.portType;
			// Override the enabled to the enabled
			data.enabled = "on";
			debugAddDedicatedIpSchema("Overriding public port to %d, port count to %d, tunnel type to %s, and enabled to %s", data.public_port, data.port_count, data.tunnel_type, data.enabled);
		}

		// Conditionally require fields for "both", "tcp", and "udp" tunnel types
		const isPortType = data.tunnel_type === "both" || data.tunnel_type === "tcp" || data.tunnel_type === "udp";

		if (isPortType) {
			if (!data["tunnel-desc"]) {
				ctx.addIssue({
					code: "custom",
					message: "Tunnel description is required for 'both', 'tcp', and 'udp' tunnel types",
					path: ["tunnel-desc"],
				});
			}
		}
	}),
}

export type AddDedicatedIpSchemaBody = z.infer<typeof addDedicatedIpSchema["body"]>;
export type AddDedicatedIpSchemaParams = z.infer<typeof addDedicatedIpSchema["params"]>;
export type AddDedicatedIpSchema = {
	params: AddDedicatedIpSchemaParams;
	body: AddDedicatedIpSchemaBody;
}
export default addDedicatedIpSchema;