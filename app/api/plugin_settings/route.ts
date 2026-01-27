import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * GET /api/plugin_settings
 * List my plugin settings
 *
 * Proxies to TRMNL API
 */
export async function GET(request: Request) {
	return proxyToTRMNL("/api/plugin_settings", "GET", request, {
		forwardAuth: true,
	});
}

/**
 * POST /api/plugin_settings
 * Create a new plugin setting
 *
 * Proxies to TRMNL API
 */
export async function POST(request: Request) {
	const body = await request.json();
	return proxyToTRMNL("/api/plugin_settings", "POST", request, {
		forwardAuth: true,
		body,
	});
}
