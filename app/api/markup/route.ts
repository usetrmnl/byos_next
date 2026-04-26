import { Liquid } from "liquidjs";
import { proxyToTRMNL } from "@/lib/api/proxy";
import {
	registerCustomFilters,
	removeCosmeticParens,
	wrapNonLiquidScripts,
} from "@/lib/recipes/liquid-renderer";
import { isProxyLive } from "@/lib/trmnl/registry";

/**
 * POST /api/markup
 *
 * Renders a Liquid template locally with liquidjs, mirroring TRMNL's
 * `/api/markup` contract:
 *   Request:  { "markup": "<liquid>", "variables": { ... } }
 *   Response: { "data": "<rendered html>" }
 *
 * Falls back to the upstream TRMNL proxy when:
 *   - TRMNL_PROXY_LIVE=true is set, or
 *   - the request body shape isn't recognized (no `markup` string).
 */
export async function POST(request: Request) {
	if (isProxyLive()) {
		const body = await request.json().catch(() => ({}));
		return proxyToTRMNL("/api/markup", "POST", cloneRequest(request), { body });
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const markup = typeof body.markup === "string" ? body.markup : null;
	if (!markup) {
		return proxyToTRMNL("/api/markup", "POST", cloneRequest(request), { body });
	}

	const variables =
		body.variables && typeof body.variables === "object"
			? (body.variables as Record<string, unknown>)
			: {};

	const engine = new Liquid({
		strictFilters: false,
		strictVariables: false,
	});
	registerCustomFilters(engine);

	try {
		const prepared = removeCosmeticParens(wrapNonLiquidScripts(markup));
		const rendered = await engine.parseAndRender(prepared, variables);
		return Response.json({ data: rendered });
	} catch (error) {
		return Response.json(
			{
				error: "Failed to render Liquid template",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 422 },
		);
	}
}

/**
 * proxyToTRMNL consumes the request body via fetch options, but we already
 * read it. Pass a fresh Request with the original headers so header forwarding
 * (Authorization, Access-Token) keeps working.
 */
function cloneRequest(request: Request): Request {
	return new Request(request.url, {
		method: request.method,
		headers: request.headers,
	});
}
