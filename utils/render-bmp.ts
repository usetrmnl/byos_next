import sharp from "sharp";

/** Dithering method options */
export enum DitheringMethod {
	FLOYD_STEINBERG = "floyd-steinberg",
	ATKINSON = "atkinson",
	BAYER = "bayer",
	RANDOM = "random",
}

/** Bayer matrix (8x8) for dithering */
const BAYER_MATRIX_8x8: number[][] = [
	[0, 32, 8, 40, 2, 34, 10, 42],
	[48, 16, 56, 24, 50, 18, 58, 26],
	[12, 44, 4, 36, 14, 46, 6, 38],
	[60, 28, 52, 20, 62, 30, 54, 22],
	[3, 35, 11, 43, 1, 33, 9, 41],
	[51, 19, 59, 27, 49, 17, 57, 25],
	[15, 47, 7, 39, 13, 45, 5, 37],
	[63, 31, 55, 23, 61, 29, 53, 21],
];

/** Bayer matrices of different sizes */
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
	8: BAYER_MATRIX_8x8,
};

/**
 * Quantize a value to the nearest available gray level
 */
const quantizeToLevel = (value: number, levels: number): number => {
	const step = 255 / (levels - 1);
	const quantized = Math.round(value / step) * step;
	return Math.min(255, Math.max(0, quantized));
};

/**
 * Apply Floyd-Steinberg dithering algorithm
 */
const applyFloydSteinberg = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	grayscaleLevels: number = 2,
	inverted: boolean = false,
): Uint8Array => {
	// Create a copy of the grayscale array to avoid modifying the original
	const result = new Uint8Array(grayscale.length);
	const buffer = new Float32Array(grayscale.length);

	// Initialize buffer with grayscale values
	for (let i = 0; i < grayscale.length; i++) {
		buffer[i] = grayscale[i];
	}

	// Apply Floyd-Steinberg dithering
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const oldPixel = buffer[index];
			const newPixel = quantizeToLevel(oldPixel, grayscaleLevels);
			const finalPixel = inverted ? 255 - newPixel : newPixel;
			result[index] = finalPixel;
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
 * Apply Atkinson dithering algorithm
 */
const applyAtkinson = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	grayscaleLevels: number = 2,
	inverted: boolean = false,
): Uint8Array => {
	// Create a copy of the grayscale array to avoid modifying the original
	const result = new Uint8Array(grayscale.length);
	const buffer = new Float32Array(grayscale.length);

	// Initialize buffer with grayscale values
	for (let i = 0; i < grayscale.length; i++) {
		buffer[i] = grayscale[i];
	}

	// Apply Atkinson dithering
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const oldPixel = buffer[index];
			const newPixel = quantizeToLevel(oldPixel, grayscaleLevels);
			const finalPixel = inverted ? 255 - newPixel : newPixel;
			result[index] = finalPixel;
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
 * Apply Bayer dithering algorithm
 */
const applyBayer = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	grayscaleLevels: number = 2,
	patternSize: number = 8,
	inverted: boolean = false,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);

	// Use the closest available matrix size
	const matrixSize = patternSize <= 2 ? 2 : patternSize <= 4 ? 4 : 8;
	const matrix = BAYER_MATRICES[matrixSize];
	const matrixLength = matrix.length;

	// Normalize the matrix values to 0-255 range
	const normalizedMatrix = matrix.map((row) =>
		row.map((val) => Math.floor((val * 255) / (matrixLength * matrixLength))),
	);

	// Apply Bayer dithering
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const gray = grayscale[index];
			const matrixX = x % matrixLength;
			const matrixY = y % matrixLength;
			const threshold = normalizedMatrix[matrixY][matrixX];

			// Apply threshold and quantize to nearest level
			const adjustedValue = gray + (threshold - 128);
			const quantizedValue = quantizeToLevel(adjustedValue, grayscaleLevels);
			result[index] = inverted ? 255 - quantizedValue : quantizedValue;
		}
	}

	return result;
};

/**
 * Apply random dithering
 */
const applyRandom = (
	grayscale: Uint8Array,
	_width: number,
	_height: number,
	grayscaleLevels: number = 2,
	inverted: boolean = false,
): Uint8Array => {
	const result = new Uint8Array(grayscale.length);

	for (let i = 0; i < grayscale.length; i++) {
		const gray = grayscale[i];
		const randomThreshold = Math.random() * 255;
		const adjustedValue = gray + (randomThreshold - 128);
		const quantizedValue = quantizeToLevel(adjustedValue, grayscaleLevels);
		result[i] = inverted ? 255 - quantizedValue : quantizedValue;
	}

	return result;
};

/**
 * Apply the specified dithering method to the grayscale image
 */
const applyDithering = (
	grayscale: Uint8Array,
	width: number,
	height: number,
	method: DitheringMethod = DitheringMethod.FLOYD_STEINBERG,
	grayscaleLevels: number = 2,
	inverted: boolean = false,
): Uint8Array => {
	switch (method) {
		case DitheringMethod.FLOYD_STEINBERG:
			return applyFloydSteinberg(
				grayscale,
				width,
				height,
				grayscaleLevels,
				inverted,
			);
		case DitheringMethod.ATKINSON:
			return applyAtkinson(grayscale, width, height, grayscaleLevels, inverted);
		case DitheringMethod.BAYER:
			return applyBayer(grayscale, width, height, grayscaleLevels, 8, inverted);
		case DitheringMethod.RANDOM:
			return applyRandom(grayscale, width, height, grayscaleLevels, inverted);
		default:
			return applyFloydSteinberg(
				grayscale,
				width,
				height,
				grayscaleLevels,
				inverted,
			);
	}
};

export interface RenderBmpOptions {
	ditheringMethod?: DitheringMethod;
	inverted?: boolean;
	width?: number;
	height?: number;
	grayscale?: number; // Number of gray levels: 2 (black/white), 4, or 16
}

export async function renderBmp(png: Buffer, options: RenderBmpOptions = {}) {
	const {
		ditheringMethod = DitheringMethod.FLOYD_STEINBERG,
		inverted = false,
		grayscale = 2, // Default to 2 levels (black/white)
	} = options;

	// Validate grayscale levels
	const validLevels = [2, 4, 16];
	if (!validLevels.includes(grayscale)) {
		throw new Error(
			`Invalid grayscale value: ${grayscale}. Must be one of: ${validLevels.join(", ")}`,
		);
	}

	// Fixed dimensions to match the device requirements
	const targetWidth = options.width ?? 800;
	const targetHeight = options.height ?? 480;
	const targetPixelCount = targetWidth * targetHeight;

	// Load image metadata
	const metadata = await sharp(png).metadata();
	const isDoubleSize =
		metadata.width === targetWidth * 2 && metadata.height === targetHeight * 2;

	// Step 1: Resize to 800x480 if necessary
	let image = sharp(png);
	if (isDoubleSize) {
		image = image.resize(targetWidth, targetHeight, {
			kernel: sharp.kernel.nearest,
		});
	}

	const grayscaleImage = await image
		.grayscale()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const { data } = grayscaleImage; // `data` is a Uint8Array of grayscale values

	// Step 2: Process the grayscale image
	const grayscaleData = new Uint8Array(targetPixelCount);
	const isEdge = new Uint8Array(targetPixelCount);

	// First, copy grayscale data
	for (let y = 0; y < targetHeight; y++) {
		for (let x = 0; x < targetWidth; x++) {
			const i = y * targetWidth + x;
			grayscaleData[i] = data[i] as number;
		}
	}

	// Step 3: Edge detection
	for (let y = 0; y < targetHeight; y++) {
		const yOffset = y * targetWidth;

		for (let x = 0; x < targetWidth; x++) {
			const idx = yOffset + x;
			const gray = grayscaleData[idx];

			// Edge detection for pixels not on the border
			if (y > 0 && y < targetHeight - 1 && x > 0 && x < targetWidth - 1) {
				// Check if this pixel has high contrast with neighbors
				const fuzziness = 20;
				const hasExtreme =
					gray < fuzziness ||
					gray > 255 - fuzziness ||
					grayscaleData[idx - 1] < fuzziness ||
					grayscaleData[idx - 1] > 255 - fuzziness ||
					grayscaleData[idx + 1] < fuzziness ||
					grayscaleData[idx + 1] > 255 - fuzziness ||
					grayscaleData[idx - targetWidth] < fuzziness ||
					grayscaleData[idx - targetWidth] > 255 - fuzziness ||
					grayscaleData[idx + targetWidth] < fuzziness ||
					grayscaleData[idx + targetWidth] > 255 - fuzziness;

				isEdge[idx] = hasExtreme ? 1 : 0;
			}
		}
	}

	// Step 4: Apply the selected dithering method (with quantization to target gray levels)
	const dithered = applyDithering(
		grayscaleData,
		targetWidth,
		targetHeight,
		ditheringMethod,
		grayscale,
		inverted,
	);

	// Determine BMP format based on grayscale levels
	const bitsPerPixel = grayscale === 2 ? 1 : grayscale === 4 ? 2 : 4;
	const numColors = grayscale;
	const paletteSize = numColors * 4; // Each color is 4 bytes (BGR + reserved)

	// BMP file header (14 bytes) + Info header (40 bytes)
	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const rowSize = Math.floor((targetWidth * bitsPerPixel + 31) / 32) * 4;
	const headerSize = fileHeaderSize + infoHeaderSize + paletteSize;
	const fileSize = headerSize + rowSize * targetHeight;

	// Create a buffer of exactly the required size
	const buffer = Buffer.alloc(fileSize);

	// BMP File Header - matching firmware expectations
	buffer.write("BM", 0); // Signature
	buffer.writeUInt32LE(fileSize, 2); // File Size
	buffer.writeUInt32LE(0, 6); // Reserved
	buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize + paletteSize, 10); // Pixel data offset

	// BMP Info Header - matching firmware expectations
	buffer.writeUInt32LE(infoHeaderSize, 14); // Info Header Size
	buffer.writeInt32LE(targetWidth, 18); // Width
	buffer.writeInt32LE(targetHeight, 22); // Height
	buffer.writeUInt16LE(1, 26); // Planes
	buffer.writeUInt16LE(bitsPerPixel, 28); // Bits per pixel
	buffer.writeUInt32LE(0, 30); // Compression
	buffer.writeUInt32LE(rowSize * targetHeight, 34); // Image Size
	buffer.writeInt32LE(0, 38); // X pixels per meter
	buffer.writeInt32LE(0, 42); // Y pixels per meter
	buffer.writeUInt32LE(numColors, 46); // Total Colors
	buffer.writeUInt32LE(numColors, 50); // Important Colors

	// Color Palette - generate gray shades (lightest to darkest)
	// Index 0 = white (lightest), Index N-1 = black (darkest)
	const paletteOffset = fileHeaderSize + infoHeaderSize;
	const paletteStep = 255 / (grayscale - 1);
	for (let i = 0; i < grayscale; i++) {
		// Generate from white (255) to black (0)
		const grayValue = Math.round(255 - i * paletteStep);
		// BMP palette format: BGR + reserved byte (0x00)
		const paletteEntry = (grayValue << 16) | (grayValue << 8) | grayValue;
		buffer.writeUInt32LE(paletteEntry, paletteOffset + i * 4);
	}

	// Step 6: Generate the final bitmap
	const dataOffset = fileHeaderSize + infoHeaderSize + paletteSize;

	// Create a mapping function from quantized grayscale value to palette index
	// Palette: index 0 = white (255), index N-1 = black (0)
	const valueToIndex = (value: number): number => {
		// Map from 0-255 to palette index (0 = white, N-1 = black)
		return grayscale - 1 - Math.round(value / paletteStep);
	};

	// Process pixels based on bit depth
	for (let y = 0; y < targetHeight; y++) {
		// BMP is stored bottom-up, so we need to flip the y-coordinate
		const targetY = targetHeight - 1 - y;
		const yOffset = targetY * targetWidth;
		const destRowOffset = dataOffset + y * rowSize;

		if (bitsPerPixel === 1) {
			// 1-bit: 8 pixels per byte
			for (let x = 0; x < targetWidth; x += 8) {
				let byte = 0;
				const remainingPixels = Math.min(8, targetWidth - x);

				for (let bit = 0; bit < remainingPixels; bit++) {
					const pixelX = x + bit;
					const idx = yOffset + pixelX;
					const ditheredValue = dithered[idx];
					const gray = grayscaleData[idx];
					let paletteIndex = valueToIndex(ditheredValue);

					if (gray < 10) {
						// Pure black pixel
						paletteIndex = 1;
					} else if (gray > 240) {
						// Pure white pixel
						paletteIndex = 0;
					} else if (isEdge[idx]) {
						// On an edge (likely text) - round to black for better contrast
						paletteIndex = gray < 128 ? 1 : 0;
					} else {
						// Not on an edge (likely in an image) - use dithered result
						paletteIndex = ditheredValue < 128 ? 1 : 0; // Values are either 0 or 255
					}

					// Invert if needed
					if (inverted) {
						paletteIndex = grayscale - 1 - paletteIndex;
					}

					// For 1-bit, palette index 1 = black, index 0 = white
					// Set bit to 1 if palette index is 1 (black)
					if (paletteIndex === grayscale - 1) {
						byte |= 1 << (7 - bit);
					}
				}

				buffer[destRowOffset + (x >> 3)] = byte;
			}
		} else if (bitsPerPixel === 2) {
			// 2-bit: 4 pixels per byte
			for (let x = 0; x < targetWidth; x += 4) {
				let byte = 0;
				const remainingPixels = Math.min(4, targetWidth - x);

				for (let bit = 0; bit < remainingPixels; bit++) {
					const pixelX = x + bit;
					const idx = yOffset + pixelX;
					const ditheredValue = dithered[idx];
					const gray = grayscaleData[idx];
					let paletteIndex = valueToIndex(ditheredValue);

					if (gray < 10) {
						// Pure black pixel
						paletteIndex = grayscale - 1;
					} else if (gray > 240) {
						// Pure white pixel
						paletteIndex = 0;
					} else if (isEdge[idx]) {
						// On an edge (likely text) - round to black or white for better contrast
						paletteIndex = gray < 128 ? grayscale - 1 : 0;
					} else {
						// Not on an edge (likely in an image) - use dithered result
						paletteIndex = valueToIndex(ditheredValue);
					}

					// Invert if needed
					if (inverted) {
						paletteIndex = grayscale - 1 - paletteIndex;
					}

					// Pack 2 bits per pixel (bits 7-6, 5-4, 3-2, 1-0)
					byte |= paletteIndex << (6 - bit * 2);
				}

				buffer[destRowOffset + (x >> 2)] = byte;
			}
		} else if (bitsPerPixel === 4) {
			// 4-bit: 2 pixels per byte
			for (let x = 0; x < targetWidth; x += 2) {
				let byte = 0;
				const remainingPixels = Math.min(2, targetWidth - x);

				for (let bit = 0; bit < remainingPixels; bit++) {
					const pixelX = x + bit;
					const idx = yOffset + pixelX;
					const ditheredValue = dithered[idx];
					const gray = grayscaleData[idx];
					let paletteIndex = valueToIndex(ditheredValue);

					if (gray < 10) {
						// Pure black pixel
						paletteIndex = grayscale - 1;
					} else if (gray > 240) {
						// Pure white pixel
						paletteIndex = 0;
					} else if (isEdge[idx]) {
						// On an edge (likely text) - round to black or white for better contrast
						paletteIndex = gray < 128 ? grayscale - 1 : 0;
					} else {
						// Not on an edge (likely in an image) - use dithered result
						paletteIndex = valueToIndex(ditheredValue);
					}

					// Invert if needed
					if (inverted) {
						paletteIndex = grayscale - 1 - paletteIndex;
					}

					// Pack 4 bits per pixel (bits 7-4 for first pixel, 3-0 for second)
					byte |= paletteIndex << (4 - bit * 4);
				}

				buffer[destRowOffset + (x >> 1)] = byte;
			}
		}
	}

	return buffer;
}
