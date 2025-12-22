import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * GET /api/palettes
 * List all palettes
 *
 * Proxies to TRMNL API
 */
export async function GET(request: Request) {
	return proxyToTRMNL("/api/palettes", "GET", request);
}
