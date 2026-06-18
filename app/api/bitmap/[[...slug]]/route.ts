import type { NextRequest } from "next/server";
import { cache } from "react";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	logger,
	renderRecipeForDevice,
	renderRecipeToImage,
} from "@/lib/recipes/recipe-renderer";
import { stripImageExtension } from "@/lib/render/device-image-url";
import {
	type DeviceProfile,
	getDeviceProfile,
} from "@/lib/trmnl/device-profile";
import { normalizeGrayscale } from "@/lib/trmnl/grayscale";
import {
	parseRequestHeaders,
	type RequestHeaders,
	resolveUserIdFromApiKey,
} from "../../display/utils";

const MAX_IMAGE_DIMENSION = 4096;
const MAX_IMAGE_PIXELS = 6_000_000;

type RequestedDimensions =
	| { ok: true; width?: number; height?: number }
	| { ok: false; response: Response };

function parseDimension(
	value: string | null,
	label: string,
): { ok: true; value?: number } | { ok: false; response: Response } {
	if (value === null) return { ok: true };
	if (!/^\d+$/.test(value)) {
		return {
			ok: false,
			response: Response.json(
				{ error: `${label} must be a positive integer` },
				{ status: 422 },
			),
		};
	}
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return {
			ok: false,
			response: Response.json(
				{ error: `${label} must be a positive integer` },
				{ status: 422 },
			),
		};
	}
	if (parsed > MAX_IMAGE_DIMENSION) {
		return {
			ok: false,
			response: Response.json(
				{ error: `${label} must be <= ${MAX_IMAGE_DIMENSION}` },
				{ status: 422 },
			),
		};
	}
	return { ok: true, value: parsed };
}

function parseRequestedDimensions(
	widthParam: string | null,
	heightParam: string | null,
): RequestedDimensions {
	const width = parseDimension(widthParam, "width");
	if (!width.ok) return width;
	const height = parseDimension(heightParam, "height");
	if (!height.ok) return height;
	if (
		width.value !== undefined &&
		height.value !== undefined &&
		width.value * height.value > MAX_IMAGE_PIXELS
	) {
		return {
			ok: false,
			response: Response.json(
				{ error: `image area must be <= ${MAX_IMAGE_PIXELS} pixels` },
				{ status: 422 },
			),
		};
	}
	return { ok: true, width: width.value, height: height.value };
}

function rejectOversizedArea(width: number, height: number): Response | null {
	if (width * height <= MAX_IMAGE_PIXELS) return null;
	return Response.json(
		{ error: `image area must be <= ${MAX_IMAGE_PIXELS} pixels` },
		{ status: 422 },
	);
}

function parseGrayscale(value: string | null): number | Response {
	if (value === null) return normalizeGrayscale(undefined);
	if (!/^\d+$/.test(value)) {
		return Response.json(
			{ error: "grayscale must be a positive integer" },
			{ status: 422 },
		);
	}
	return normalizeGrayscale(Number.parseInt(value, 10));
}

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	const headers = parseRequestHeaders(req);
	try {
		// Always await params as required by Next.js 14/15
		const { slug = ["not-found"] } = await params;
		const bitmapPath = Array.isArray(slug) ? slug.join("/") : slug;
		const recipeSlug = stripImageExtension(bitmapPath);

		// Get width, height, and grayscale from query parameters
		const { searchParams } = new URL(req.url);
		const widthParam = searchParams.get("width");
		const heightParam = searchParams.get("height");
		const grayscaleParam = searchParams.get("grayscale");
		const modelParam = searchParams.get("model");
		const paletteParam = searchParams.get("palette_id");

		const requestedDimensions = parseRequestedDimensions(
			widthParam,
			heightParam,
		);
		if (!requestedDimensions.ok) return requestedDimensions.response;
		const grayscaleLevels = parseGrayscale(grayscaleParam);
		if (grayscaleLevels instanceof Response) return grayscaleLevels;

		logger.info(
			`Bitmap request for: ${bitmapPath} with ${grayscaleLevels} gray levels`,
		);

		// Resolve the device owner so DB queries are scoped to the right user
		const userId = headers.apiKey
			? await resolveUserIdFromApiKey(headers.apiKey)
			: null;

		// Forward cookies so browser rendering can reuse the caller's auth session.
		const cookieHeader = req.headers.get("cookie");
		const profile = await resolveDeviceProfileForRequest(headers, {
			modelName: modelParam,
			paletteId: paletteParam,
		});

		// The bitmap URL is server-emitted by `/api/display` via
		// `buildDeviceImageUrl`, which derives the extension from the resolved
		// profile. Profile + extension are both pinned by the URL (model and
		// palette_id are query params), so dispatch on profile MIME alone:
		// PNG/WebP profiles use the device-image renderer, BMP profiles use
		// the legacy bitmap renderer.
		if (profile.model.mime_type !== "image/bmp") {
			const imageWidth = requestedDimensions.width ?? profile.model.width;
			const imageHeight = requestedDimensions.height ?? profile.model.height;
			const oversized = rejectOversizedArea(imageWidth, imageHeight);
			if (oversized) return oversized;
			const image = await renderRecipeForDevice({
				slug: recipeSlug,
				profile,
				width: imageWidth,
				height: imageHeight,
				userId,
				cookies: cookieHeader || undefined,
			});

			if (!image?.buffer.length) {
				logger.warn(
					`Failed to generate device image for ${recipeSlug}, returning fallback`,
				);
				return renderFallbackDeviceImage(profile);
			}

			return new Response(new Uint8Array(image.buffer), {
				headers: getImageResponseHeaders(image),
			});
		}

		const validWidth = requestedDimensions.width ?? DEFAULT_IMAGE_WIDTH;
		const validHeight = requestedDimensions.height ?? DEFAULT_IMAGE_HEIGHT;
		const oversized = rejectOversizedArea(validWidth, validHeight);
		if (oversized) return oversized;
		const recipeBuffer = await renderRecipeBitmap(
			recipeSlug,
			validWidth,
			validHeight,
			grayscaleLevels,
			userId,
			cookieHeader || undefined,
		);

		if (
			!recipeBuffer ||
			!(recipeBuffer instanceof Buffer) ||
			recipeBuffer.length === 0
		) {
			logger.warn(
				`Failed to generate bitmap for ${recipeSlug}, returning fallback`,
			);
			const fallback = await renderFallbackBitmap();
			return fallback;
		}

		return new Response(new Uint8Array(recipeBuffer), {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": recipeBuffer.length.toString(),
			},
		});
	} catch (error) {
		logger.error("Error generating image:", error);

		// Instead of returning an error, return the NotFoundScreen as a fallback
		return await renderFallbackBitmap();
	}
}

async function resolveDeviceProfileForRequest(
	headers: RequestHeaders,
	query: { modelName?: string | null; paletteId?: string | null } = {},
): Promise<DeviceProfile> {
	let modelName = query.modelName || headers.model;
	let paletteId: string | null = query.paletteId || null;

	if (headers.apiKey && !query.modelName) {
		const { ready } = await checkDbConnection();
		if (ready) {
			const device = await db
				.selectFrom("devices")
				.select(["model", "palette_id"])
				.where("api_key", "=", headers.apiKey)
				.executeTakeFirst();

			modelName = device?.model ?? modelName;
			paletteId = device?.palette_id ?? null;
		}
	}

	return getDeviceProfile(modelName, paletteId);
}

function getImageResponseHeaders(image: {
	buffer: Buffer;
	mime_type: string;
	size_limit_exceeded?: boolean;
}) {
	return {
		"Content-Type": image.mime_type,
		"Content-Length": image.buffer.length.toString(),
		...(image.size_limit_exceeded
			? { "X-TRMNL-Image-Size-Limit-Exceeded": "true" }
			: {}),
	};
}

const renderRecipeBitmap = cache(
	async (
		recipeId: string,
		width: number,
		height: number,
		grayscaleLevels: number = 2,
		userId: string | null = null,
		cookies?: string,
	) => {
		const renders = await renderRecipeToImage({
			slug: recipeId,
			imageWidth: width,
			imageHeight: height,
			formats: ["bitmap"],
			grayscale: grayscaleLevels,
			userId,
			cookies,
		});
		return renders.bitmap ?? Buffer.from([]);
	},
);

const renderFallbackBitmap = cache(async () => {
	try {
		const renders = await renderRecipeToImage({
			slug: "not-found",
			imageWidth: DEFAULT_IMAGE_WIDTH,
			imageHeight: DEFAULT_IMAGE_HEIGHT,
			formats: ["bitmap"],
			grayscale: 2,
		});

		if (!renders.bitmap) {
			throw new Error("Missing bitmap buffer for fallback");
		}

		return new Response(new Uint8Array(renders.bitmap), {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": renders.bitmap.length.toString(),
			},
		});
	} catch (fallbackError) {
		logger.error("Error generating fallback image:", fallbackError);
		return new Response("Error generating image", {
			status: 500,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}
});

async function renderFallbackDeviceImage(profile: DeviceProfile) {
	try {
		const image = await renderRecipeForDevice({
			slug: "not-found",
			profile,
		});

		if (!image?.buffer.length) {
			throw new Error("Missing device image buffer for fallback");
		}

		return new Response(new Uint8Array(image.buffer), {
			headers: getImageResponseHeaders(image),
		});
	} catch (fallbackError) {
		logger.error("Error generating fallback image:", fallbackError);
		return new Response("Error generating image", {
			status: 500,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}
}
