import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * GET /api/ips
 * List all TRMNL server IP addresses
 *
 * Proxies to TRMNL API
 */
export async function GET(request: Request) {
	return proxyToTRMNL("/api/ips", "GET", request);
}
