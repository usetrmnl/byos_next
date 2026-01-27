import { proxyToTRMNL, proxyToTRMNLMultipart } from "@/lib/api/proxy";

/**
 * GET /api/plugin_settings/{id}/archive
 * Download a plugin setting archive
 *
 * Proxies to TRMNL API
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return proxyToTRMNL(`/api/plugin_settings/${id}/archive`, "GET", request, {
		forwardAuth: true,
	});
}

/**
 * POST /api/plugin_settings/{id}/archive
 * Upload a plugin setting archive
 *
 * Proxies to TRMNL API
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return proxyToTRMNLMultipart(`/api/plugin_settings/${id}/archive`, request, {
		forwardAuth: true,
	});
}
