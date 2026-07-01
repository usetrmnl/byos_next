/**
 * Shared raster → fixed-grid bitmap conversion used by the generate script
 * and browser preload tracer.
 */

export type TraceMode = "fit" | "pixelSnap" | "metricSnap";
export type InkDetection = "luminance" | "nonWhite" | "anyDark";

export type TraceGridOptions = {
	targetWidth: number;
	targetHeight: number;
	threshold?: number;
	mode?: TraceMode;
	inkDetection?: InkDetection;
};

function luminance(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isInkPixel(
	pixels: Uint8ClampedArray,
	index: number,
	threshold: number,
	inkDetection: InkDetection = "luminance",
): boolean {
	const r = pixels[index];
	const g = pixels[index + 1];
	const b = pixels[index + 2];

	if (inkDetection === "nonWhite") {
		return Math.min(r, g, b) < 240;
	}

	return luminance(r, g, b) < threshold;
}

/** Find ink bounding box in RGBA pixel data (alpha channel ignored). */
export function findInkBounds(
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
	threshold = 128,
	_mode: TraceMode = "fit",
	inkDetection: InkDetection = "luminance",
): { minX: number; minY: number; maxX: number; maxY: number } | null {
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			if (isInkPixel(pixels, i, threshold, inkDetection)) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}

	if (maxX < minX || maxY < minY) return null;
	return { minX, minY, maxX, maxY };
}

/** Scale ink bbox to fit target grid (legacy vector-font path). */
export function sampleToBinaryGrid(
	pixels: Uint8ClampedArray,
	sourceWidth: number,
	sourceHeight: number,
	bounds: { minX: number; minY: number; maxX: number; maxY: number },
	options: TraceGridOptions,
): string {
	const {
		targetWidth,
		targetHeight,
		threshold = 128,
		inkDetection = "luminance",
	} = options;
	const cropW = bounds.maxX - bounds.minX + 1;
	const cropH = bounds.maxY - bounds.minY + 1;
	const scale = Math.min(targetWidth / cropW, targetHeight / cropH);
	const drawW = Math.max(1, Math.round(cropW * scale));
	const drawH = Math.max(1, Math.round(cropH * scale));
	const offsetX = Math.floor((targetWidth - drawW) / 2);
	const offsetY = Math.floor((targetHeight - drawH) / 2);

	let binary = "";
	for (let y = 0; y < targetHeight; y++) {
		for (let x = 0; x < targetWidth; x++) {
			const tx = x - offsetX;
			const ty = y - offsetY;
			if (tx < 0 || ty < 0 || tx >= drawW || ty >= drawH) {
				binary += "0";
				continue;
			}
			const sx = bounds.minX + (tx / drawW) * cropW;
			const sy = bounds.minY + (ty / drawH) * cropH;
			const px = Math.min(sourceWidth - 1, Math.max(0, Math.floor(sx)));
			const py = Math.min(sourceHeight - 1, Math.max(0, Math.floor(sy)));
			const i = (py * sourceWidth + px) * 4;
			binary += isInkPixel(pixels, i, threshold, inkDetection) ? "1" : "0";
		}
	}
	return binary;
}

/** 1:1 crop from canvas origin — preserves baseline / top alignment. */
export function directCropToGrid(
	pixels: Uint8ClampedArray,
	sourceWidth: number,
	sourceHeight: number,
	options: TraceGridOptions,
): string {
	const {
		targetWidth,
		targetHeight,
		threshold = 128,
		inkDetection = "luminance",
	} = options;

	let binary = "";
	for (let y = 0; y < targetHeight; y++) {
		for (let x = 0; x < targetWidth; x++) {
			if (x >= sourceWidth || y >= sourceHeight) {
				binary += "0";
				continue;
			}
			const i = (y * sourceWidth + x) * 4;
			binary += isInkPixel(pixels, i, threshold, inkDetection) ? "1" : "0";
		}
	}
	return binary;
}

/** Place ink in a fixed cell, optionally centering horizontally. */
export function embedInkInCell(
	pixels: Uint8ClampedArray,
	sourceWidth: number,
	sourceHeight: number,
	bounds: { minX: number; minY: number; maxX: number; maxY: number },
	options: TraceGridOptions & { centerHorizontally?: boolean },
): string {
	const {
		targetWidth,
		targetHeight,
		threshold = 128,
		inkDetection = "luminance",
		centerHorizontally = false,
	} = options;
	const inkW = bounds.maxX - bounds.minX + 1;
	const offsetX = centerHorizontally
		? Math.floor((targetWidth - inkW) / 2) - bounds.minX
		: 0;

	let binary = "";
	for (let y = 0; y < targetHeight; y++) {
		for (let x = 0; x < targetWidth; x++) {
			const sx = x - offsetX;
			if (sx < 0 || sx >= sourceWidth || y >= sourceHeight) {
				binary += "0";
				continue;
			}
			const i = (y * sourceWidth + sx) * 4;
			binary += isInkPixel(pixels, i, threshold, inkDetection) ? "1" : "0";
		}
	}
	return binary;
}

/** Center a glyph horizontally in a fixed-width cell without scaling ink. */
export function measureHorizontalCenterOffset(
	pixels: Uint8ClampedArray,
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	threshold = 128,
	inkDetection: InkDetection = "luminance",
): number {
	const bounds = findInkBounds(
		pixels,
		sourceWidth,
		sourceHeight,
		threshold,
		"metricSnap",
		inkDetection,
	);
	if (!bounds) return 0;

	const inkW = bounds.maxX - bounds.minX + 1;
	return Math.floor((targetWidth - inkW) / 2) - bounds.minX;
}

export function rgbaToBinaryGrid(
	pixels: Uint8ClampedArray,
	sourceWidth: number,
	sourceHeight: number,
	options: TraceGridOptions & { centerHorizontally?: boolean },
): string {
	if (options.mode === "pixelSnap") {
		return directCropToGrid(pixels, sourceWidth, sourceHeight, options);
	}

	if (options.mode === "metricSnap") {
		const bounds = findInkBounds(
			pixels,
			sourceWidth,
			sourceHeight,
			options.threshold,
			options.mode,
			options.inkDetection,
		);
		if (!bounds) {
			return "0".repeat(options.targetWidth * options.targetHeight);
		}

		return embedInkInCell(pixels, sourceWidth, sourceHeight, bounds, options);
	}

	const bounds = findInkBounds(
		pixels,
		sourceWidth,
		sourceHeight,
		options.threshold,
		options.mode,
		options.inkDetection,
	);
	if (!bounds) {
		return "0".repeat(options.targetWidth * options.targetHeight);
	}

	return sampleToBinaryGrid(pixels, sourceWidth, sourceHeight, bounds, options);
}

/** Basic printable ASCII used for build-time bitmap generation. */
export const BASIC_ASCII_CHAR_CODES = Array.from(
	{ length: 95 },
	(_, i) => i + 32,
);

/** Alias used by font trace scripts. */
export const BASIC_ASCII = BASIC_ASCII_CHAR_CODES;
