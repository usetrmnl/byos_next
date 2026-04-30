import type React from "react";
import { createElement } from "react";
import sharp from "sharp";
import { renderHtmlToImage } from "@/lib/recipes/html-screenshot";
import { renderWithSatori } from "@/lib/recipes/renderers/satori";
import { renderWithTakumi } from "@/lib/recipes/renderers/takumi";
import {
	getTrmnlModelClassName,
	getTrmnlModelStyle,
} from "@/lib/trmnl/model-css";
import type { TrmnlModel } from "@/lib/trmnl/registry";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";

/**
 * Pure rasterization: takes either an HTML string or a React element and
 * produces PNG/bitmap buffers. Knows nothing about recipes or the database.
 */

export type RasterizeFormat = "bitmap" | "png";

export type RasterizeRenderSettings = {
	doubleSizeForSharperText?: boolean;
	applyEdgeSnap?: boolean;
};

export type RasterizeOptions = {
	slug: string;
	imageWidth: number;
	imageHeight: number;
	formats?: RasterizeFormat[];
	grayscale?: number;
	renderSettings?: RasterizeRenderSettings | null;
	model?: TrmnlModel | null;
	paletteId?: string | null;
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
	settings: RasterizeRenderSettings | null | undefined,
) {
	const useDoubling = settings?.doubleSizeForSharperText ?? false;
	const scaleFactor = useDoubling ? 2 : 1;
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
		cookies,
	} = options;

	const results = defaultResults();
	const needsPng = formats.includes("png");
	const needsBitmap = formats.includes("bitmap");
	if (!needsPng && !needsBitmap) return results;

	const target = getRasterDimensions(imageWidth, imageHeight, renderSettings);

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
				const scaleFactor = target.width / imageWidth;
				pngBuffer = await renderWithBrowser(
					slug,
					imageWidth,
					imageHeight,
					scaleFactor,
					cookies,
					{ model: model?.name ?? null, paletteId: paletteId ?? null },
				);
			} else {
				const wrapped = wrapWithTrmnlCss(
					options.element,
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
			const scaleFactor = target.width / imageWidth;
			pngBuffer = await renderWithBrowser(
				slug,
				imageWidth,
				imageHeight,
				scaleFactor,
				cookies,
				{ model: model?.name ?? null, paletteId: paletteId ?? null },
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
