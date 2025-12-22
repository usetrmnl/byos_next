import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * GET /api/plugin_settings/{id}/data
 * Get the data of a plugin setting
 *
 * Proxies to TRMNL API
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return proxyToTRMNL(`/api/plugin_settings/${id}/data`, "GET", request, {
		forwardAuth: true,
	});
}

/**
 * POST /api/plugin_settings/{id}/data
 * Update data for a plugin setting
 *
 * Proxies to TRMNL API
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = await request.json();
	return proxyToTRMNL(`/api/plugin_settings/${id}/data`, "POST", request, {
		forwardAuth: true,
		body,
	});
}
