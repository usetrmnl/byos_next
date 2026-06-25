import type React from "react";
import { renderHtmlToImage } from "@/lib/recipes/html-screenshot";
import {
	wrapLogicalCanvasToTarget,
	wrapWithTrmnlCss,
} from "@/lib/recipes/render/frame";
import { rewriteReactImagesForDevice } from "@/lib/recipes/render/image-dither-intercept";
import { resolveImageDitherPolicy } from "@/lib/recipes/render/image-dither-policy";
import { renderWithSatori } from "@/lib/recipes/renderers/satori";
import { renderWithTakumi } from "@/lib/recipes/renderers/takumi";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import type { TrmnlModel } from "@/lib/trmnl/types";
import type { RecipeRenderSettings } from "../types";

/**
 * Pure rasterization: takes either an HTML string or a React element and
 * produces a PNG buffer. Knows nothing about recipes or the database.
 */

export type RasterizeOptions = {
	slug: string;
	imageWidth: number;
	imageHeight: number;
	layoutWidth?: number;
	layoutHeight?: number;
	renderSettings?: RecipeRenderSettings | null;
	model?: TrmnlModel | null;
	profile?: DeviceProfile | null;
	paletteId?: string | null;
	userId?: string | null;
} & (
	| {
			html: string;
			element?: never;
			cookies?: string;
	  }
	| {
			html?: never;
			element: React.ReactElement;
			cookies?: string;
	  }
);

export type RasterizeResults = {
	png: Buffer | null;
};

export function getRendererType(): "takumi" | "satori" | "browser" {
	const renderer = process.env.REACT_RENDERER?.toLowerCase();
	if (renderer === "satori") return "satori";
	if (renderer === "browser") return "browser";
	return "takumi";
}

export async function rasterize(
	options: RasterizeOptions,
): Promise<RasterizeResults> {
	const {
		slug,
		imageWidth,
		imageHeight,
		renderSettings,
		model,
		profile,
		paletteId,
		userId,
		cookies,
	} = options;
	const imageDitherPolicy = resolveImageDitherPolicy({
		renderSettings,
		profile,
	});

	const target = { width: imageWidth, height: imageHeight };
	const layoutWidth = options.layoutWidth ?? imageWidth;
	const layoutHeight = options.layoutHeight ?? imageHeight;

	let pngBuffer: Buffer;
	try {
		if ("html" in options && options.html !== undefined) {
			pngBuffer = await renderHtmlToImage(
				options.html,
				target.width,
				target.height,
				model ?? null,
				imageDitherPolicy,
			);
		} else if ("element" in options && options.element) {
			const rendererType = getRendererType();
			if (rendererType === "browser") {
				const { renderWithBrowser } = await import("../renderers/browser");
				pngBuffer = await renderWithBrowser(
					slug,
					imageWidth,
					imageHeight,
					cookies,
					{
						model: model?.name ?? null,
						paletteId: paletteId ?? null,
						userId,
						captureWidth: target.width,
						captureHeight: target.height,
					},
				);
			} else {
				const element = await rewriteReactImagesForDevice(
					options.element,
					imageDitherPolicy,
				);
				const scaled = wrapLogicalCanvasToTarget(
					element,
					layoutWidth,
					layoutHeight,
					target.width,
					target.height,
				);
				const wrapped = wrapWithTrmnlCss(
					scaled,
					model ?? null,
					target.width,
					target.height,
				);
				pngBuffer =
					rendererType === "satori"
						? await renderWithSatori(wrapped, target.width, target.height)
						: await renderWithTakumi(wrapped, target.width, target.height);
			}
		} else {
			throw new Error(`[rasterize:${slug}] No render input provided`);
		}
	} catch (error) {
		console.error(`[rasterize:${slug}] Error generating PNG:`, error);
		throw error;
	}

	return { png: pngBuffer };
}
