import { getRegistry } from "@/lib/trmnl/registry";

/**
 * GET /api/palettes
 * List all palettes.
 *
 * Served from a local 24h cache seeded by `data/trmnl/palettes.json`.
 * Set TRMNL_PROXY_LIVE=true to always proxy upstream.
 */
export async function GET() {
	try {
		const data = await getRegistry("palettes");
		return Response.json(data);
	} catch (error) {
		return Response.json(
			{
				error: "Failed to load palettes registry",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
