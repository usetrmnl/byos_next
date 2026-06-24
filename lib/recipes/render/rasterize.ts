import type React from "react";
import { createElement } from "react";
import sharp from "sharp";
import { renderHtmlToImage } from "@/lib/recipes/html-screenshot";
import { getRenderScale } from "@/lib/recipes/render/settings";
import { renderWithSatori } from "@/lib/recipes/renderers/satori";
import { renderWithTakumi } from "@/lib/recipes/renderers/takumi";
import {
	getTrmnlModelClassName,
	getTrmnlModelStyle,
} from "@/lib/trmnl/model-css";
import type { TrmnlModel } from "@/lib/trmnl/types";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";
import type { RecipeRenderSettings } from "../types";

/**
 * Pure rasterization: takes either an HTML string or a React element and
 * produces PNG/bitmap buffers. Knows nothing about recipes or the database.
 */

export type RasterizeFormat = "bitmap" | "png";

export type RasterizeOptions = {
	slug: string;
	imageWidth: number;
	imageHeight: number;
	layoutWidth?: number;
	layoutHeight?: number;
	formats?: RasterizeFormat[];
	grayscale?: number;
	renderSettings?: RecipeRenderSettings | null;
	model?: TrmnlModel | null;
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
	| {
			html?: never;
			element?: never;
			browser: { width: number; height: number };
			cookies?: string;
	  }
);

export type RasterizeResults = {
	bitmap: Buffer | null;
	png: Buffer | null;
};

const defaultResults = (): RasterizeResults => ({ bitmap: null, png: null });

function getRasterDimensions(
	width: number,
	height: number,
	settings: RecipeRenderSettings | null | undefined,
) {
	const scaleFactor = getRenderScale(settings);
	return { width: width * scaleFactor, height: height * scaleFactor };
}

export function getRendererType(): "takumi" | "satori" | "browser" {
	const renderer = process.env.REACT_RENDERER?.toLowerCase();
	if (renderer === "satori") return "satori";
	if (renderer === "browser") return "browser";
	return "takumi";
}

function wrapWithTrmnlCss(
	element: React.ReactElement,
	model: TrmnlModel | null,
	width: number,
	height: number,
): React.ReactElement {
	const className = getTrmnlModelClassName(model);
	const vars = getTrmnlModelStyle(model);
	if (!className && !vars) return element;
	return createElement(
		"div",
		{
			className: className || undefined,
			style: { width, height, display: "flex", ...vars },
		},
		element,
	);
}

function wrapLogicalCanvasToTarget(
	element: React.ReactElement,
	layoutWidth: number,
	layoutHeight: number,
	targetWidth: number,
	targetHeight: number,
): React.ReactElement {
	if (layoutWidth === targetWidth && layoutHeight === targetHeight)
		return element;
	const scaleX = targetWidth / layoutWidth;
	const scaleY = targetHeight / layoutHeight;
	return createElement(
		"div",
		{
			style: {
				display: "flex",
				width: targetWidth,
				height: targetHeight,
				overflow: "hidden",
			},
		},
		createElement(
			"div",
			{
				style: {
					display: "flex",
					width: layoutWidth,
					height: layoutHeight,
					transform: `scale(${scaleX}, ${scaleY})`,
					transformOrigin: "top left",
				},
			},
			element,
		),
	);
}

export async function rasterize(
	options: RasterizeOptions,
): Promise<RasterizeResults> {
	const {
		slug,
		imageWidth,
		imageHeight,
		formats = ["bitmap", "png"],
		grayscale,
		renderSettings,
		model,
		paletteId,
		userId,
		cookies,
	} = options;

	const results = defaultResults();
	const needsPng = formats.includes("png");
	const needsBitmap = formats.includes("bitmap");
	if (!needsPng && !needsBitmap) return results;

	const target = getRasterDimensions(imageWidth, imageHeight, renderSettings);
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
				const scaled = wrapLogicalCanvasToTarget(
					options.element,
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
		} else if ("browser" in options && options.browser) {
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
			console.error(`[rasterize:${slug}] No html or element provided`);
			return results;
		}
	} catch (error) {
		console.error(`[rasterize:${slug}] Error generating PNG:`, error);
		return results;
	}

	if (needsPng) {
		results.png =
			target.width !== imageWidth
				? await sharp(pngBuffer)
						.resize(imageWidth, imageHeight)
						.png()
						.toBuffer()
				: pngBuffer;
	}

	if (needsBitmap) {
		try {
			results.bitmap = await renderBmp(pngBuffer, {
				ditheringMethod: DitheringMethod.FLOYD_STEINBERG,
				width: imageWidth,
				height: imageHeight,
				applyEdgeSnap: renderSettings?.applyEdgeSnap ?? true,
				...(grayscale !== undefined && { grayscale }),
			});
		} catch (error) {
			console.error(`[rasterize:${slug}] Error generating bitmap:`, error);
		}
	}

	return results;
}
