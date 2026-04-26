import { getRegistry } from "@/lib/trmnl/registry";

/**
 * GET /api/categories
 * List all plugin categories.
 *
 * Served from a local 24h cache seeded by `data/trmnl/categories.json`.
 * Set TRMNL_PROXY_LIVE=true to always proxy upstream.
 */
export async function GET() {
	try {
		const data = await getRegistry("categories");
		return Response.json(data);
	} catch (error) {
		return Response.json(
			{
				error: "Failed to load categories registry",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
