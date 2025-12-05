import type { NextRequest } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	getLayoutById,
	type LayoutSlot,
	MIXUP_CANVAS_HEIGHT,
	MIXUP_CANVAS_WIDTH,
} from "@/lib/mixup/constants";
import {
	addDimensionsToProps,
	buildRecipeElement,
	logger,
	renderRecipeOutputs,
} from "@/lib/recipes/recipe-renderer";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const mixupId = id.replace(".bmp", "");

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

		const layout = getLayoutById(mixup.layout_id);
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
			width: MIXUP_CANVAS_WIDTH,
			height: MIXUP_CANVAS_HEIGHT,
			channels: 3,
			background: { r: 255, g: 255, b: 255 },
		},
	})
		.composite(overlays)
		.png()
		.toBuffer();

	// Convert to BMP with dithering
	const bmpBuffer = await renderBmp(
		new Response(compositedPng, { headers: { "Content-Type": "image/png" } }),
		{
			ditheringMethod: DitheringMethod.ATKINSON,
			width: MIXUP_CANVAS_WIDTH,
			height: MIXUP_CANVAS_HEIGHT,
		},
	);

	return bmpBuffer;
}
