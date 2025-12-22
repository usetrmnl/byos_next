import { proxyToTRMNL } from "@/lib/api/proxy";

/**
 * DELETE /api/plugin_settings/{id}
 * Delete a plugin setting
 *
 * Proxies to TRMNL API
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return proxyToTRMNL(`/api/plugin_settings/${id}`, "DELETE", request, {
		forwardAuth: true,
	});
}
