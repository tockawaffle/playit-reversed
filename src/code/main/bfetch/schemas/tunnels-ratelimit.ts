import z from "zod";

const tunnelsRatelimitSchema = {
	params: z.object({
		tunnelId: z.string()
	}),
	body: z.object({
		_csrf_token: z.string(),
		tunnel_id: z.string(),
		bps: z.enum(["unlimited", "1 kbps", "10 kbps", "100 kbps", "1 mbps", "10 mbps", "20 mbps"]).transform((value) => {
			const realValue = {
				"unlimited": 0,
				"1 kbps": 1024,
				"10 kbps": 10240,
				"100 kbps": 102400,
				"1 mbps": 1048576,
				"10 mbps": 10485760,
				"20 mbps": 20971520,
			}[value];
			return realValue;
		}),
		pps: z.enum(["unlimited", "2 pps", "10 pps", "1000 pps"]).transform((value) => {
			const realValue = {
				"unlimited": 0,
				"2 pps": 2,
				"10 pps": 10,
				"1000 pps": 1000,
			}[value];
			return realValue;
		}),
	})
};

export default tunnelsRatelimitSchema;