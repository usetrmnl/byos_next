import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * GET /api/models
 * List all device models
 *
 * Proxies to TRMNL API
 */
export async function GET(request: Request) {
	return proxyToTRMNL("/api/models", "GET", request);
}
