import type { NextRequest } from "next/server";
import sharp from "sharp";
import screens from "@/app/(app)/recipes/screens.json";
import { renderWithBrowser } from "@/lib/recipes/browser-renderer";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	fetchRecipeConfig,
	logger,
} from "@/lib/recipes/recipe-renderer";
import { toBitDepth } from "@/utils/render-bmp";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	try {
		const { slug = ["not-found"] } = await params;
		const screenshotPath = Array.isArray(slug) ? slug.join("/") : slug;

		// Detect format from file extension, default to PNG
		const isBmp = screenshotPath.endsWith(".bmp");
		const recipeSlug = screenshotPath.replace(/\.(bmp|png)$/, "");

		const { searchParams } = new URL(req.url);
		const widthParam = searchParams.get("width");
		const heightParam = searchParams.get("height");
		const bitDepthParam = searchParams.get("bitdepth");

		const width = widthParam ? parseInt(widthParam, 10) : DEFAULT_IMAGE_WIDTH;
		const height = heightParam
			? parseInt(heightParam, 10)
			: DEFAULT_IMAGE_HEIGHT;
		const validWidth = width > 0 ? width : DEFAULT_IMAGE_WIDTH;
		const validHeight = height > 0 ? height : DEFAULT_IMAGE_HEIGHT;
		const rawBitDepth = bitDepthParam ? parseInt(bitDepthParam, 10) : 2;
		const bitDepth = ([1, 2, 4] as const).includes(rawBitDepth as 1 | 2 | 4)
			? (rawBitDepth as 1 | 2 | 4)
			: 2;

		const recipeId = screens[recipeSlug as keyof typeof screens]
			? recipeSlug
			: "simple-text";

		const config = fetchRecipeConfig(recipeId);
		const useDoubling =
			config?.renderSettings?.doubleSizeForSharperText ?? false;
		const renderWidth = useDoubling ? validWidth * 2 : validWidth;
		const renderHeight = useDoubling ? validHeight * 2 : validHeight;

		logger.info(
			`Screenshot request for: ${screenshotPath} in ${validWidth}x${validHeight}${useDoubling ? " (2x)" : ""} as ${isBmp ? `bmp (${bitDepth}-bit)` : "png"}`,
		);

		let pngBuffer = await renderWithBrowser({
			slug: recipeId,
			width: renderWidth,
			height: renderHeight,
		});

		if (pngBuffer && useDoubling) {
			pngBuffer = await sharp(pngBuffer)
				.resize(validWidth, validHeight)
				.png()
				.toBuffer();
		}

		if (!pngBuffer) {
			logger.error(`[Browser] Failed to render recipe: ${recipeId}`);
			return new Response("Failed to render screenshot", {
				status: 500,
				headers: { "Content-Type": "text/plain" },
			});
		}

		if (isBmp) {
			const bmpBuffer = await toBitDepth(pngBuffer, {
				width: validWidth,
				height: validHeight,
				grayscale: 1 << bitDepth,
			});

			return new Response(new Uint8Array(bmpBuffer), {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": bmpBuffer.length.toString(),
					"Cache-Control": "no-store",
				},
			});
		}

		return new Response(new Uint8Array(pngBuffer), {
			headers: {
				"Content-Type": "image/png",
				"Content-Length": pngBuffer.length.toString(),
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		logger.error("Error generating screenshot:", error);
		return new Response("Error generating screenshot", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});
	}
}
