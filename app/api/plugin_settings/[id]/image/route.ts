import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	findPluginSetting,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";
import {
	ALLOWED_IMAGE_MIME_TYPES,
	jsonError,
	MAX_INLINE_IMAGE_BYTES,
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
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;

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

	const result = await withExplicitUserScope(auth.userId, async (scopedDb) => {
		const setting = await findPluginSetting(scopedDb, id);
		if (!setting) return { kind: "not_found" } as const;

		const updated = await scopedDb
			.updateTable("plugin_settings")
			.set({
				icon_url: dataUrl,
				icon_content_type: sniffed,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", setting.id)
			.returningAll()
			.executeTakeFirstOrThrow();

		return {
			kind: "ok",
			icon_url: updated.icon_url,
			icon_content_type: updated.icon_content_type,
		} as const;
	});

	if (result.kind === "not_found") {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({
		data: {
			icon_url: result.icon_url,
			icon_content_type: result.icon_content_type,
		},
	});
}
