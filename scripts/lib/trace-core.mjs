/** Shared raster → grid conversion for build-time font generation. */

export function luminance(r, g, b) {
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isInkPixel(pixels, index, threshold, inkDetection = "luminance") {
	const r = pixels[index];
	const g = pixels[index + 1];
	const b = pixels[index + 2];

	if (inkDetection === "nonWhite") {
		return Math.min(r, g, b) < 240;
	}

	return luminance(r, g, b) < threshold;
}

export function findInkBounds(
	pixels,
	width,
	height,
	threshold = 128,
	mode = "fit",
	inkDetection = "luminance",
) {
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
	pixels,
	sourceWidth,
	sourceHeight,
	bounds,
	targetWidth,
	targetHeight,
	threshold = 128,
	mode = "fit",
	inkDetection = "luminance",
) {
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

/** Place ink in a fixed cell, optionally centering horizontally. */
export function embedInkInCell(
	pixels,
	sourceWidth,
	sourceHeight,
	bounds,
	targetWidth,
	targetHeight,
	threshold = 128,
	inkDetection = "luminance",
	centerHorizontally = false,
) {
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

/** 1:1 crop from canvas origin — preserves baseline / top alignment. */
export function directCropToGrid(
	pixels,
	sourceWidth,
	sourceHeight,
	targetWidth,
	targetHeight,
	threshold = 128,
	inkDetection = "luminance",
) {
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

/** Center a glyph horizontally in a fixed-width cell without scaling ink. */
export function measureHorizontalCenterOffset(
	pixels,
	sourceWidth,
	sourceHeight,
	targetWidth,
	threshold = 128,
	inkDetection = "luminance",
) {
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
	pixels,
	sourceWidth,
	sourceHeight,
	options,
) {
	const {
		targetWidth,
		targetHeight,
		threshold = 128,
		mode = "fit",
		inkDetection = "luminance",
	} = options;

	if (mode === "pixelSnap") {
		return directCropToGrid(
			pixels,
			sourceWidth,
			sourceHeight,
			targetWidth,
			targetHeight,
			threshold,
			inkDetection,
		);
	}

	if (mode === "metricSnap") {
		const bounds = findInkBounds(
			pixels,
			sourceWidth,
			sourceHeight,
			threshold,
			mode,
			inkDetection,
		);
		if (!bounds) return "0".repeat(targetWidth * targetHeight);

		return embedInkInCell(
			pixels,
			sourceWidth,
			sourceHeight,
			bounds,
			targetWidth,
			targetHeight,
			threshold,
			inkDetection,
			options.centerHorizontally ?? false,
		);
	}

	const bounds = findInkBounds(
		pixels,
		sourceWidth,
		sourceHeight,
		threshold,
		mode,
		inkDetection,
	);
	if (!bounds) return "0".repeat(targetWidth * targetHeight);

	return sampleToBinaryGrid(
		pixels,
		sourceWidth,
		sourceHeight,
		bounds,
		targetWidth,
		targetHeight,
		threshold,
		mode,
		inkDetection,
	);
}

export const BASIC_ASCII = Array.from({ length: 95 }, (_, i) => i + 32);
