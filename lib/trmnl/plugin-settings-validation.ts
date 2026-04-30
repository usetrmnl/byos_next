/**
 * Shared validation for plugin_settings inputs.
 *
 * Centralizes the size caps, allow-lists, and shape guards that the route
 * handlers were either skipping or duplicating. Routes return whatever
 * `assertJsonObjectBody` etc. produce, so they all reject identical garbage
 * the same way.
 */

import { isJsonObject } from "@/lib/trmnl/plugin-settings";

export const CANONICAL_MARKUP_SIZES = [
	"markup_full",
	"markup_quadrant",
	"markup_half_horizontal",
	"markup_half_vertical",
] as const;

export type CanonicalMarkupSize = (typeof CANONICAL_MARKUP_SIZES)[number];

const CANONICAL_MARKUP_SET = new Set<string>(CANONICAL_MARKUP_SIZES);

export function isCanonicalMarkupSize(
	size: string,
): size is CanonicalMarkupSize {
	return CANONICAL_MARKUP_SET.has(size);
}

export const MAX_MARKUP_BYTES_PER_SIZE = 256 * 1024;
export const MAX_FIELDS_BYTES = 64 * 1024;
export const MAX_FIELDS_KEYS = 64;
export const MAX_MERGE_VARIABLES_BYTES = 256 * 1024;
export const MAX_MERGE_VARIABLES_KEYS = 256;

export const MAX_LIST_PAGE_SIZE = 200;
export const DEFAULT_LIST_PAGE_SIZE = 50;

export const ALLOWED_IMAGE_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"image/svg+xml",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const ALLOWED_IMAGE_MIME_SET = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);

export const MAX_INLINE_IMAGE_BYTES = 1 * 1024 * 1024;

export type ValidationError = { error: string; status: 422 };

export function jsonError(error: string): Response {
	return Response.json({ error }, { status: 422 });
}

/**
 * Parse JSON body and reject anything that isn't a plain object.
 *
 * `request.json()` returns `null` for a literal `null` body, raw strings for
 * a literal string body, and arrays for arrays — each of which would crash
 * a downstream `body.foo` access with TypeError → 500. Routes get a 422
 * with a real error message instead.
 */
export async function parseJsonObjectBody(
	request: Request,
): Promise<Record<string, unknown> | Response> {
	let parsed: unknown;
	try {
		parsed = await request.json();
	} catch {
		return jsonError("Invalid JSON body");
	}
	if (!isJsonObject(parsed)) {
		return jsonError("Body must be a JSON object");
	}
	return parsed as Record<string, unknown>;
}

export function validateMarkupContent(content: unknown): string | Response {
	if (typeof content !== "string") {
		return jsonError("content is required and must be a string");
	}
	const byteLength = Buffer.byteLength(content, "utf8");
	if (byteLength > MAX_MARKUP_BYTES_PER_SIZE) {
		return jsonError(
			`content exceeds ${MAX_MARKUP_BYTES_PER_SIZE} bytes (got ${byteLength})`,
		);
	}
	return content;
}

export function validateMarkupSize(
	size: string,
): CanonicalMarkupSize | Response {
	if (!isCanonicalMarkupSize(size)) {
		return jsonError(
			`Invalid markup size. Allowed: ${CANONICAL_MARKUP_SIZES.join(", ")}`,
		);
	}
	return size;
}

function validateJsonObjectBytes(
	value: Record<string, unknown>,
	label: string,
	maxBytes: number,
	maxKeys: number,
): Record<string, unknown> | Response {
	const keyCount = Object.keys(value).length;
	if (keyCount > maxKeys) {
		return jsonError(`${label} exceeds ${maxKeys} keys (got ${keyCount})`);
	}
	const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
	if (bytes > maxBytes) {
		return jsonError(`${label} exceeds ${maxBytes} bytes (got ${bytes})`);
	}
	return value;
}

export function validateFields(
	value: unknown,
): Record<string, unknown> | Response {
	if (!isJsonObject(value)) {
		return jsonError("fields must be a JSON object");
	}
	const obj = value as Record<string, unknown>;
	for (const v of Object.values(obj)) {
		if (v !== null && typeof v !== "string") {
			return jsonError("field values must be strings or null");
		}
	}
	return validateJsonObjectBytes(
		obj,
		"fields",
		MAX_FIELDS_BYTES,
		MAX_FIELDS_KEYS,
	);
}

export function validateMergeVariables(
	value: unknown,
): Record<string, unknown> | Response {
	if (!isJsonObject(value)) {
		return jsonError("merge_variables must be a JSON object");
	}
	return validateJsonObjectBytes(
		value as Record<string, unknown>,
		"merge_variables",
		MAX_MERGE_VARIABLES_BYTES,
		MAX_MERGE_VARIABLES_KEYS,
	);
}

export function isResponse(value: unknown): value is Response {
	return value instanceof Response;
}

/**
 * Sniff the first few bytes of an image upload to verify the declared MIME
 * type. Stops a client from posting an executable while claiming `image/png`.
 *
 * Returns the canonical MIME type derived from the bytes, or null if the
 * bytes don't match any allow-listed image format.
 */
export function sniffImageMimeType(
	bytes: Uint8Array,
): AllowedImageMimeType | null {
	if (bytes.length >= 8) {
		// PNG: 89 50 4E 47 0D 0A 1A 0A
		if (
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47 &&
			bytes[4] === 0x0d &&
			bytes[5] === 0x0a &&
			bytes[6] === 0x1a &&
			bytes[7] === 0x0a
		) {
			return "image/png";
		}
	}
	if (bytes.length >= 3) {
		// JPEG: FF D8 FF
		if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
			return "image/jpeg";
		}
	}
	if (bytes.length >= 12) {
		// WEBP: "RIFF" .... "WEBP"
		if (
			bytes[0] === 0x52 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x46 &&
			bytes[8] === 0x57 &&
			bytes[9] === 0x45 &&
			bytes[10] === 0x42 &&
			bytes[11] === 0x50
		) {
			return "image/webp";
		}
	}
	if (bytes.length >= 6) {
		// GIF: "GIF87a" or "GIF89a"
		if (
			bytes[0] === 0x47 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x38 &&
			(bytes[4] === 0x37 || bytes[4] === 0x39) &&
			bytes[5] === 0x61
		) {
			return "image/gif";
		}
	}
	// SVG: text-based, look for "<svg" or "<?xml" + "<svg" within the first KB
	const head = new TextDecoder("utf-8", { fatal: false }).decode(
		bytes.slice(0, Math.min(bytes.length, 1024)),
	);
	if (/<svg[\s>]/i.test(head)) {
		return "image/svg+xml";
	}
	return null;
}

export function isAllowedImageMimeType(
	mime: string,
): mime is AllowedImageMimeType {
	return ALLOWED_IMAGE_MIME_SET.has(mime);
}

export function parsePaginationParams(searchParams: URLSearchParams): {
	limit: number;
	offset: number;
} {
	const rawLimit = Number.parseInt(searchParams.get("page_size") ?? "", 10);
	const rawPage = Number.parseInt(searchParams.get("page") ?? "", 10);
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0
			? Math.min(rawLimit, MAX_LIST_PAGE_SIZE)
			: DEFAULT_LIST_PAGE_SIZE;
	const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
	return { limit, offset: (page - 1) * limit };
}
