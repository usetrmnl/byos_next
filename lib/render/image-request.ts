import { normalizeGrayscale } from "@/lib/trmnl/grayscale";

export const MAX_IMAGE_DIMENSION = 4096;
export const MAX_IMAGE_PIXELS = 6_000_000;

export type ParsedImageRequest = {
	width?: number;
	height?: number;
	grayscaleLevels: number;
	modelName: string | null;
	paletteId: string | null;
};

type ParseResult<T> = { ok: true; value: T } | { ok: false; response: Response };

function validationError(message: string): Response {
	return Response.json({ error: message }, { status: 422 });
}

function parseDimension(
	value: string | null,
	label: string,
	defaultValue?: number,
): ParseResult<number | undefined> {
	if (value === null) return { ok: true, value: defaultValue };
	if (!/^\d+$/.test(value)) {
		return {
			ok: false,
			response: validationError(`${label} must be a positive integer`),
		};
	}
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return {
			ok: false,
			response: validationError(`${label} must be a positive integer`),
		};
	}
	if (parsed > MAX_IMAGE_DIMENSION) {
		return {
			ok: false,
			response: validationError(`${label} must be <= ${MAX_IMAGE_DIMENSION}`),
		};
	}
	return { ok: true, value: parsed };
}

function parseGrayscale(value: string | null): ParseResult<number> {
	if (value === null) return { ok: true, value: normalizeGrayscale(undefined) };
	if (!/^\d+$/.test(value)) {
		return {
			ok: false,
			response: validationError("grayscale must be a positive integer"),
		};
	}
	return { ok: true, value: normalizeGrayscale(Number.parseInt(value, 10)) };
}

export function rejectOversizedImageArea(
	width: number,
	height: number,
): Response | null {
	if (width * height <= MAX_IMAGE_PIXELS) return null;
	return validationError(`image area must be <= ${MAX_IMAGE_PIXELS} pixels`);
}

export function parseImageRequest(
	searchParams: URLSearchParams,
	defaults: { width?: number; height?: number } = {},
): ParsedImageRequest | Response {
	const width = parseDimension(searchParams.get("width"), "width", defaults.width);
	if (!width.ok) return width.response;
	const height = parseDimension(
		searchParams.get("height"),
		"height",
		defaults.height,
	);
	if (!height.ok) return height.response;
	if (width.value !== undefined && height.value !== undefined) {
		const oversized = rejectOversizedImageArea(width.value, height.value);
		if (oversized) return oversized;
	}
	const grayscale = parseGrayscale(searchParams.get("grayscale"));
	if (!grayscale.ok) return grayscale.response;
	return {
		width: width.value,
		height: height.value,
		grayscaleLevels: grayscale.value,
		modelName: searchParams.get("model"),
		paletteId: searchParams.get("palette_id"),
	};
}
