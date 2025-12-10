import type { NextRequest } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { getLayoutById, type LayoutSlot } from "@/lib/mixup/constants";
import {
	addDimensionsToProps,
	buildRecipeElement,
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	logger,
	renderRecipeOutputs,
} from "@/lib/recipes/recipe-renderer";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const mixupId = id.replace(".bmp", "");

		// Get width, height, and grayscale from query parameters
		const { searchParams } = new URL(req.url);
		const widthParam = searchParams.get("width");
		const heightParam = searchParams.get("height");
		const grayscaleParam = searchParams.get("grayscale");

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

		// Fetch mixup and its slots
		const [mixup, slots] = await Promise.all([
			db
				.selectFrom("mixups")
				.selectAll()
				.where("id", "=", mixupId)
				.executeTakeFirst(),
			db
				.selectFrom("mixup_slots")
				.selectAll()
				.where("mixup_id", "=", mixupId)
				.orderBy("order_index", "asc")
				.execute(),
		]);

		if (!mixup) {
			logger.warn(`Mixup not found: ${mixupId}`);
			return new Response("Mixup not found", { status: 404 });
		}

		const layout = getLayoutById(mixup.layout_id, width, height);
		if (!layout) {
			logger.warn(`Invalid layout for mixup ${mixupId}: ${mixup.layout_id}`);
			return new Response("Invalid layout", { status: 400 });
		}

		// Build slot assignments map
		const assignments: Record<string, string | null> = {};
		for (const slot of slots) {
			assignments[slot.slot_id] = slot.recipe_slug;
		}

		logger.info(
			`Rendering mixup ${mixupId} with layout ${mixup.layout_id} and ${slots.length} slots`,
		);

		// Render the mixup composite
		const compositeBuffer = await renderMixupComposite(
			layout.slots,
			assignments,
			width,
			height,
			grayscaleLevels,
		);

		return new Response(new Uint8Array(compositeBuffer), {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": compositeBuffer.length.toString(),
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
): Promise<Buffer | null> {
	try {
		const { config, Component, props, element } = await buildRecipeElement({
			slug: recipeSlug,
		});

		const ComponentToRender = Component ?? (() => element);
		const propsWithDimensions = addDimensionsToProps(
			props,
			slot.width,
			slot.height,
		);

		const renders = await renderRecipeOutputs({
			slug: recipeSlug,
			Component: ComponentToRender,
			props: propsWithDimensions,
			config: config ?? null,
			imageWidth: slot.width,
			imageHeight: slot.height,
			formats: ["png"],
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
 * Render all slots and composite them into a final bitmap
 */
async function renderMixupComposite(
	slots: LayoutSlot[],
	assignments: Record<string, string | null>,
	width: number,
	height: number,
	grayscaleLevels: number = 2,
): Promise<Buffer> {
	// Render all slots in parallel
	const slotRenders = await Promise.all(
		slots.map(async (slot) => {
			const recipeSlug = assignments[slot.id];
			if (!recipeSlug) {
				return { slot, buffer: null };
			}

			const buffer = await renderSlot(slot, recipeSlug);
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

	// Convert to BMP with dithering
	const bmpBuffer = await renderBmp(compositedPng, {
		ditheringMethod: DitheringMethod.ATKINSON,
		width,
		height,
		grayscale: grayscaleLevels,
	});

	return bmpBuffer;
}
