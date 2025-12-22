import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * POST /api/markup
 * Render Liquid template
 *
 * Proxies to TRMNL API
 */
export async function POST(request: Request) {
	const body = await request.json();
	return proxyToTRMNL("/api/markup", "POST", request, {
		body,
	});
}
