import type { NextRequest } from "next/server";
import { cache } from "react";
import NotFoundScreen from "@/app/recipes/screens/not-found/not-found";
import screens from "@/app/recipes/screens.json";
import {
	buildRecipeElement,
	logger,
	renderRecipeOutputs,
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	addDimensionsToProps,
} from "@/app/recipes/lib/recipe-renderer";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	try {
		// Always await params as required by Next.js 14/15
		const { slug = ["not-found"] } = await params;
		const bitmapPath = Array.isArray(slug) ? slug.join("/") : slug;
		const recipeSlug = bitmapPath.replace(".bmp", "");

		logger.info(`Bitmap request for: ${bitmapPath} in ${DEFAULT_IMAGE_WIDTH}x${DEFAULT_IMAGE_HEIGHT}`);

		const recipeId = screens[recipeSlug as keyof typeof screens]
			? recipeSlug
			: "simple-text";

		const recipeBuffer = await renderRecipeBitmap(
			recipeId,
			DEFAULT_IMAGE_WIDTH,
			DEFAULT_IMAGE_HEIGHT,
		);

		if (!recipeBuffer || !(recipeBuffer instanceof Buffer) || recipeBuffer.length === 0) {
			logger.warn(`Failed to generate bitmap for ${recipeId}, returning fallback`);
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
		return await renderFallbackBitmap("Error occurred");
	}
}

const renderRecipeBitmap = cache(
	async (recipeId: string, width: number, height: number) => {
		const { config, Component, props, element } = await buildRecipeElement({
			slug: recipeId,
		});

		const ComponentToRender =
			Component ??
			(() => {
				return element;
			});

		const propsWithDimensions = addDimensionsToProps(props, width, height);

		const renders = await renderRecipeOutputs({
			slug: recipeId,
			Component: ComponentToRender,
			props: propsWithDimensions,
			config: config ?? null,
			imageWidth: width,
			imageHeight: height,
			formats: ["bitmap"],
		});

		return renders.bitmap ?? Buffer.from([]);
	},
);

const renderFallbackBitmap = cache(async (slug: string = "not-found") => {
	try {
		const renders = await renderRecipeOutputs({
			slug,
			Component: NotFoundScreen,
			props: { slug },
			config: null,
			imageWidth: DEFAULT_IMAGE_WIDTH,
			imageHeight: DEFAULT_IMAGE_HEIGHT,
			formats: ["bitmap"],
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
