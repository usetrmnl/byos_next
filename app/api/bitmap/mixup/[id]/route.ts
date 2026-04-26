import type { NextRequest } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/database/db";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { getLayoutById, type LayoutSlot } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	logger,
	renderRecipeToImage,
} from "@/lib/recipes/recipe-renderer";
import { renderDeviceImage } from "@/lib/render/device-image";
import { stripImageExtension } from "@/lib/render/device-image-url";
import { getDeviceProfile } from "@/lib/trmnl/device-profile";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const mixupId = stripImageExtension(id);

		// Get width, height, and grayscale from query parameters
		const { searchParams } = new URL(req.url);
		const widthParam = searchParams.get("width");
		const heightParam = searchParams.get("height");
		const grayscaleParam = searchParams.get("grayscale");
		const accessToken =
			searchParams.get("access_token") ?? req.headers.get("Access-Token");

		const width = widthParam ? parseInt(widthParam, 10) : DEFAULT_IMAGE_WIDTH;
		const height = heightParam
			? parseInt(heightParam, 10)
			: DEFAULT_IMAGE_HEIGHT;
		const grayscaleLevels = grayscaleParam ? parseInt(grayscaleParam, 10) : 2;

		const { ready } = await checkDbConnection();
		if (!ready) {
			logger.error("Database not available for mixup rendering");
			return new Response("Database not available", { status: 503 });
		}

		if (!accessToken) {
			return new Response("Access token is required", { status: 401 });
		}

		const device = await db
			.selectFrom("devices")
			.select(["user_id", "mixup_id", "model", "palette_id"])
			.where("api_key", "=", accessToken)
			.executeTakeFirst();

		if (!device || device.mixup_id !== mixupId || !device.user_id) {
			return new Response("Mixup not found", { status: 404 });
		}
		const profile = await getDeviceProfile(device.model, device.palette_id);

		// Fetch mixup and its slots (join with recipes to get slug)
		const [mixup, slots] = await withExplicitUserScope(
			device.user_id,
			(scopedDb) =>
				Promise.all([
					scopedDb
						.selectFrom("mixups")
						.selectAll()
						.where("id", "=", mixupId)
						.executeTakeFirst(),
					scopedDb
						.selectFrom("mixup_slots")
						.leftJoin("recipes", "recipes.id", "mixup_slots.recipe_id")
						.select([
							"mixup_slots.id",
							"mixup_slots.mixup_id",
							"mixup_slots.slot_id",
							"mixup_slots.recipe_slug",
							"mixup_slots.recipe_id",
							"mixup_slots.order_index",
							"recipes.slug as resolved_slug",
						])
						.where("mixup_slots.mixup_id", "=", mixupId)
						.orderBy("mixup_slots.order_index", "asc")
						.execute(),
				]),
		);

		if (!mixup) {
			logger.warn(`Mixup not found: ${mixupId}`);
			return new Response("Mixup not found", { status: 404 });
		}

		const layout = getLayoutById(mixup.layout_id, width, height);
		if (!layout) {
			logger.warn(`Invalid layout for mixup ${mixupId}: ${mixup.layout_id}`);
			return new Response("Invalid layout", { status: 400 });
		}

		// Build slot assignments map, preferring the normalized recipe_id relation.
		const assignments: Record<string, string | null> = {};
		for (const slot of slots) {
			assignments[slot.slot_id] = slot.resolved_slug ?? slot.recipe_slug;
		}

		logger.info(
			`Rendering mixup ${mixupId} with layout ${mixup.layout_id} and ${slots.length} slots`,
		);

		const compositedPng = await renderMixupCompositePng(
			layout.slots,
			assignments,
			width,
			height,
			device.user_id,
		);
		const image =
			profile.model.mime_type === "image/bmp"
				? {
						buffer: await renderBmp(compositedPng, {
							ditheringMethod: DitheringMethod.ATKINSON,
							width,
							height,
							grayscale: grayscaleLevels,
						}),
						mime_type: "image/bmp",
						size_limit_exceeded: false,
					}
				: await renderDeviceImage({ png: compositedPng, profile });

		return new Response(new Uint8Array(image.buffer), {
			headers: {
				"Content-Type": image.mime_type,
				"Content-Length": image.buffer.length.toString(),
				...(image.size_limit_exceeded
					? { "X-TRMNL-Image-Size-Limit-Exceeded": "true" }
					: {}),
			},
		});
	} catch (error) {
		logger.error("Error generating mixup image:", error);
		return new Response("Error generating image", { status: 500 });
	}
}

/**
 * Render a single recipe slot and return the PNG buffer
 */
async function renderSlot(
	slot: LayoutSlot,
	recipeSlug: string,
	userId: string,
): Promise<Buffer | null> {
	try {
		const renders = await renderRecipeToImage({
			slug: recipeSlug,
			imageWidth: slot.width,
			imageHeight: slot.height,
			formats: ["png"],
			userId,
		});
		return renders.png;
	} catch (error) {
		logger.error(
			`Error rendering slot ${slot.id} with recipe ${recipeSlug}:`,
			error,
		);
		return null;
	}
}

/**
 * Render all slots and composite them into a final PNG
 */
async function renderMixupCompositePng(
	slots: LayoutSlot[],
	assignments: Record<string, string | null>,
	width: number,
	height: number,
	userId: string,
): Promise<Buffer> {
	// Render all slots in parallel
	const slotRenders = await Promise.all(
		slots.map(async (slot) => {
			const recipeSlug = assignments[slot.id];
			if (!recipeSlug) {
				return { slot, buffer: null };
			}

			const buffer = await renderSlot(slot, recipeSlug, userId);
			return { slot, buffer };
		}),
	);

	// Build composite overlays
	const overlays: sharp.OverlayOptions[] = [];

	for (const { slot, buffer } of slotRenders) {
		if (!buffer) continue;

		try {
			// Resize the rendered slot to fit its position on the canvas
			const resizedSlot = await sharp(buffer)
				.resize(slot.width, slot.height, { fit: "cover" })
				.toBuffer();

			overlays.push({
				input: resizedSlot,
				left: slot.x,
				top: slot.y,
			});
		} catch (error) {
			logger.error(`Error resizing slot ${slot.id}:`, error);
		}
	}

	// Create the base canvas and composite all overlays
	const compositedPng = await sharp({
		create: {
			width,
			height,
			channels: 3,
			background: { r: 255, g: 255, b: 255 },
		},
	})
		.composite(overlays)
		.png()
		.toBuffer();

	return compositedPng;
}
