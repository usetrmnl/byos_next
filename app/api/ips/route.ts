import { getRegistry } from "@/lib/trmnl/registry";

/**
 * GET /api/ips
 * List all TRMNL server IP addresses.
 *
 * Served from a local 24h cache seeded by `data/trmnl/ips.json`.
 * Set TRMNL_PROXY_LIVE=true to always proxy upstream.
 */
export async function GET() {
	try {
		const data = await getRegistry("ips");
		return Response.json(data);
	} catch (error) {
		return Response.json(
			{
				error: "Failed to load ips registry",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
