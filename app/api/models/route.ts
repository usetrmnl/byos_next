import { getRegistry } from "@/lib/trmnl/registry";

/**
 * GET /api/models
 * List all device models.
 *
 * Served from a local 24h cache seeded by `data/trmnl/models.json`.
 * Set TRMNL_PROXY_LIVE=true to always proxy upstream.
 */
export async function GET() {
	try {
		const data = await getRegistry("models");
		return Response.json(data);
	} catch (error) {
		return Response.json(
			{
				error: "Failed to load models registry",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
