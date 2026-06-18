import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	rejectReadOnlyPluginSetting,
	requirePluginSettingsAccess,
} from "@/lib/trmnl/plugin-settings-store";
import {
	ALLOWED_IMAGE_MIME_TYPES,
	jsonError,
	MAX_INLINE_IMAGE_BYTES,
	rejectOversizedRequest,
	sniffImageMimeType,
} from "@/lib/trmnl/plugin-settings-validation";

/**
 * POST /api/plugin_settings/{id}/image
 *
 * Upload a plugin icon. The bytes are persisted inline as a `data:` URL in
 * `icon_url` so the URL the API returns is genuinely useful (browsers can
 * render it directly) without needing a separate object store. The route
 * sniffs magic bytes to verify the declared content type — clients can't
 * post a binary while claiming `image/png`.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Reject oversized uploads at the headers stage — `formData()` would
	// otherwise buffer the whole body into memory before we could check.
	const oversized = rejectOversizedRequest(request, MAX_INLINE_IMAGE_BYTES);
	if (oversized) return oversized;

	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;
	const readOnly = rejectReadOnlyPluginSetting(access.setting);
	if (readOnly) return readOnly;

	const formData = await request.formData();
	const image = formData.get("image") ?? formData.get("file");
	if (!image || typeof image === "string" || !("arrayBuffer" in image)) {
		return jsonError("image file is required");
	}

	if (image.size > MAX_INLINE_IMAGE_BYTES) {
		return jsonError(
			`Image too large (max ${MAX_INLINE_IMAGE_BYTES} bytes, got ${image.size})`,
		);
	}

	const bytes = new Uint8Array(await image.arrayBuffer());
	const sniffed = sniffImageMimeType(bytes);
	if (!sniffed) {
		return jsonError(
			`Image format not recognized. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}`,
		);
	}

	const dataUrl = `data:${sniffed};base64,${Buffer.from(bytes).toString("base64")}`;

	const updated = await withExplicitUserScope(access.userId, (scopedDb) =>
		scopedDb
			.updateTable("plugin_settings")
			.set({
				icon_url: dataUrl,
				icon_content_type: sniffed,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", access.setting.id)
			.returningAll()
			.executeTakeFirstOrThrow(),
	);

	return Response.json({
		data: {
			icon_url: updated.icon_url,
			icon_content_type: updated.icon_content_type,
		},
	});
}
