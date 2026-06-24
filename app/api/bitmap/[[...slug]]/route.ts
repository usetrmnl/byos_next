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
import { renderErrorImage } from "@/lib/render/error-image";
import {
	parseImageRequest,
	rejectOversizedImageArea,
} from "@/lib/render/image-request";
import {
	type DeviceProfile,
	getDeviceProfile,
} from "@/lib/trmnl/device-profile";
import {
	parseRequestHeaders,
	type RequestHeaders,
	resolveUserIdFromApiKey,
} from "../../display/utils";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	const headers = parseRequestHeaders(req);
	try {
		// Always await params as required by Next.js 14/15
		const { slug = ["error"] } = await params;
		const bitmapPath = Array.isArray(slug) ? slug.join("/") : slug;
		const recipeSlug = stripImageExtension(bitmapPath);

		const { searchParams } = new URL(req.url);
		const imageRequest = parseImageRequest(searchParams);
		if (imageRequest instanceof Response) return imageRequest;

		logger.info(
			`Bitmap request for: ${bitmapPath} with ${imageRequest.grayscaleLevels} gray levels`,
		);

		// Resolve the device owner so DB queries are scoped to the right user
		const userId = headers.apiKey
			? await resolveUserIdFromApiKey(headers.apiKey)
			: null;

		// Forward cookies so browser rendering can reuse the caller's auth session.
		const cookieHeader = req.headers.get("cookie");
		const profile = await resolveDeviceProfileForRequest(headers, {
			modelName: imageRequest.modelName,
			paletteId: imageRequest.paletteId,
		});

		if (recipeSlug === "error") {
			const imageWidth = imageRequest.width ?? profile.model.width;
			const imageHeight = imageRequest.height ?? profile.model.height;
			const oversized = rejectOversizedImageArea(imageWidth, imageHeight);
			if (oversized) return oversized;
			const image = await renderErrorImage({
				message: searchParams.get("message") ?? "Display error",
				width: imageWidth,
				height: imageHeight,
				grayscale: imageRequest.grayscaleLevels,
				profile,
			});
			return new Response(new Uint8Array(image.buffer), {
				headers: getImageResponseHeaders(image),
			});
		}

		// Profile + extension are both pinned by the URL (model and palette_id
		// are query params), so dispatch on profile MIME alone.
		if (profile.model.mime_type !== "image/bmp") {
			const imageWidth = imageRequest.width ?? profile.model.width;
			const imageHeight = imageRequest.height ?? profile.model.height;
			const oversized = rejectOversizedImageArea(imageWidth, imageHeight);
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
				logger.warn(`Failed to generate device image for ${recipeSlug}`);
				const errorImage = await renderErrorImage({
					message: `Could not render ${recipeSlug}`,
					width: imageWidth,
					height: imageHeight,
					grayscale: imageRequest.grayscaleLevels,
					profile,
				});
				return new Response(new Uint8Array(errorImage.buffer), {
					status: 500,
					headers: getImageResponseHeaders(errorImage),
				});
			}

			return new Response(new Uint8Array(image.buffer), {
				headers: getImageResponseHeaders(image),
			});
		}

		const validWidth = imageRequest.width ?? DEFAULT_IMAGE_WIDTH;
		const validHeight = imageRequest.height ?? DEFAULT_IMAGE_HEIGHT;
		const oversized = rejectOversizedImageArea(validWidth, validHeight);
		if (oversized) return oversized;
		const recipeBuffer = await renderRecipeBitmap(
			recipeSlug,
			validWidth,
			validHeight,
			imageRequest.grayscaleLevels,
			profile,
			userId,
			cookieHeader || undefined,
		);

		if (
			!recipeBuffer ||
			!(recipeBuffer instanceof Buffer) ||
			recipeBuffer.length === 0
		) {
			logger.warn(`Failed to generate bitmap for ${recipeSlug}`);
			const errorImage = await renderErrorImage({
				message: `Could not render ${recipeSlug}`,
				width: validWidth,
				height: validHeight,
				grayscale: imageRequest.grayscaleLevels,
			});
			return new Response(new Uint8Array(errorImage.buffer), {
				status: 500,
				headers: getImageResponseHeaders(errorImage),
			});
		}

		return new Response(new Uint8Array(recipeBuffer), {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": recipeBuffer.length.toString(),
			},
		});
	} catch (error) {
		logger.error("Error generating image:", error);
		const { searchParams } = new URL(req.url);
		const imageRequest = parseImageRequest(searchParams);
		const width =
			imageRequest instanceof Response
				? DEFAULT_IMAGE_WIDTH
				: (imageRequest.width ?? DEFAULT_IMAGE_WIDTH);
		const height =
			imageRequest instanceof Response
				? DEFAULT_IMAGE_HEIGHT
				: (imageRequest.height ?? DEFAULT_IMAGE_HEIGHT);
		const profile =
			imageRequest instanceof Response
				? null
				: await resolveProfileOrNull(headers, {
						modelName: imageRequest.modelName,
						paletteId: imageRequest.paletteId,
					});
		const errorImage = await renderErrorImage({
			message: error instanceof Error ? error.message : "Image render failed",
			width,
			height,
			grayscale:
				imageRequest instanceof Response
					? undefined
					: imageRequest.grayscaleLevels,
			profile,
		});
		return new Response(new Uint8Array(errorImage.buffer), {
			status: 500,
			headers: getImageResponseHeaders(errorImage),
		});
	}
}

async function resolveProfileOrNull(
	headers: RequestHeaders,
	query: { modelName?: string | null; paletteId?: string | null },
): Promise<DeviceProfile | null> {
	try {
		return await resolveDeviceProfileForRequest(headers, query);
	} catch {
		return null;
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
		profile: DeviceProfile | null = null,
		userId: string | null = null,
		cookies?: string,
	) => {
		const renders = await renderRecipeToImage({
			slug: recipeId,
			imageWidth: width,
			imageHeight: height,
			formats: ["bitmap"],
			grayscale: grayscaleLevels,
			model: profile?.model ?? null,
			palette: profile?.palette ?? null,
			paletteId: profile?.palette?.id ?? null,
			userId,
			cookies,
		});
		return renders.bitmap ?? Buffer.from([]);
	},
);
