import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * GET /api/categories
 * List all plugin categories
 *
 * Proxies to TRMNL API
 */
export async function GET(request: Request) {
	return proxyToTRMNL("/api/categories", "GET", request);
}
