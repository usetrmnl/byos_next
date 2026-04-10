/**
 * Pure dithering algorithms operating on single-channel grayscale Uint8Array.
 * No browser globals, no Node.js dependencies — safe for both client and server.
 */

/**
 * Quantize a value to the nearest available gray level.
 * e.g. levels=2 → 0 or 255, levels=4 → 0, 85, 170, 255
 */
export const quantizeToLevel = (value: number, levels: number): number => {
	const step = 255 / (levels - 1);
	const quantized = Math.round(value / step) * step;
	return Math.min(255, Math.max(0, quantized));
};

const BAYER_MATRICES: Record<number, number[][]> = {
	2: [
		[0, 2],
		[3, 1],
	],
	4: [
		[0, 8, 2, 10],
		[12, 4, 14, 6],
		[3, 11, 1, 9],
		[15, 7, 13, 5],
	],
	8: [
		[0, 32, 8, 40, 2, 34, 10, 42],
		[48, 16, 56, 24, 50, 18, 58, 26],
		[12, 44, 4, 36, 14, 46, 6, 38],
		[60, 28, 52, 20, 62, 30, 54, 22],
		[3, 35, 11, 43, 1, 33, 9, 41],
		[51, 19, 59, 27, 49, 17, 57, 25],
		[15, 47, 7, 39, 13, 45, 5, 37],
		[63, 31, 55, 23, 61, 29, 53, 21],
	],
};

/**
 * Apply simple threshold dithering.
 * @param levels - number of output gray levels (default 2 = black/white)
 */
export const ditheringThreshold = (
	grayscale: Uint8Array,
	threshold: number,
	levels = 2,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);
	for (let i = 0; i < grayscale.length; i++) {
		result[i] = quantizeToLevel(grayscale[i], levels);
	}
	return result;
};

/**
 * Apply Floyd-Steinberg error diffusion dithering.
 * @param levels - number of output gray levels (default 2 = black/white)
 */
export const ditheringFloydSteinberg = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	levels = 2,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);
	const buffer = new Float32Array(grayscale.length);

	for (let i = 0; i < grayscale.length; i++) {
		buffer[i] = grayscale[i];
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const oldPixel = buffer[index];
			const newPixel = quantizeToLevel(oldPixel, levels);
			result[index] = newPixel;
			const error = oldPixel - newPixel;

			if (x + 1 < width) buffer[index + 1] += (error * 7) / 16;
			if (y + 1 < height && x > 0)
				buffer[index + width - 1] += (error * 3) / 16;
			if (y + 1 < height) buffer[index + width] += (error * 5) / 16;
			if (y + 1 < height && x + 1 < width)
				buffer[index + width + 1] += (error * 1) / 16;
		}
	}

	return result;
};

/**
 * Apply Atkinson error diffusion dithering.
 * @param levels - number of output gray levels (default 2 = black/white)
 */
export const ditheringAtkinson = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	levels = 2,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);
	const buffer = new Float32Array(grayscale.length);

	for (let i = 0; i < grayscale.length; i++) {
		buffer[i] = grayscale[i];
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const oldPixel = buffer[index];
			const newPixel = quantizeToLevel(oldPixel, levels);
			result[index] = newPixel;
			const error = Math.floor((oldPixel - newPixel) / 8);

			if (x + 1 < width) buffer[index + 1] += error;
			if (x + 2 < width) buffer[index + 2] += error;
			if (y + 1 < height && x - 1 >= 0) buffer[index + width - 1] += error;
			if (y + 1 < height) buffer[index + width] += error;
			if (y + 1 < height && x + 1 < width) buffer[index + width + 1] += error;
			if (y + 2 < height) buffer[index + width * 2] += error;
		}
	}

	return result;
};

/**
 * Apply Bayer ordered dithering.
 * @param patternSize - matrix size: 2, 4, or 8 (default 8)
 * @param levels - number of output gray levels (default 2 = black/white)
 */
export const ditheringBayer = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	patternSize: 2 | 4 | 8 = 8,
	levels = 2,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);

	const matrixSize = patternSize <= 2 ? 2 : patternSize <= 4 ? 4 : 8;
	const matrix = BAYER_MATRICES[matrixSize];
	const matrixLength = matrix.length;

	const normalizedMatrix = matrix.map((row) =>
		row.map((val) => Math.floor((val * 255) / (matrixLength * matrixLength))),
	);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const gray = grayscale[index];
			const threshold = normalizedMatrix[y % matrixLength][x % matrixLength];
			const adjustedValue = gray + (threshold - 128);
			result[index] = quantizeToLevel(adjustedValue, levels);
		}
	}

	return result;
};

/**
 * Apply random dithering.
 * @param levels - number of output gray levels (default 2 = black/white)
 */
export const ditheringRandom = (
	grayscale: Uint8Array,
	levels = 2,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);

	for (let i = 0; i < grayscale.length; i++) {
		const adjustedValue = grayscale[i] + (Math.random() * 255 - 128);
		result[i] = quantizeToLevel(adjustedValue, levels);
	}

	return result;
};
