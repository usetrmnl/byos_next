import sharp from "sharp";

export type FitMode = "cover" | "contain" | "fill";

export interface ProcessImageOptions {
	url: string;
	width?: number;
	height?: number;
	bitDepth?: 1 | 2 | 4;
	fit?: FitMode;
	invert?: boolean;
	background?: string;
}

/**
 * Apply Floyd-Steinberg dithering to grayscale image data with evenly spaced levels
 */
function applyFloydSteinbergDithering(
	grayscale: Uint8Array,
	width: number,
	height: number,
	levels: number,
): Uint8Array {
	const result = new Uint8Array(grayscale.length);
	const buffer = new Float32Array(grayscale.length);

	// Initialize buffer with grayscale values
	for (let i = 0; i < grayscale.length; i++) {
		buffer[i] = grayscale[i];
	}

	const step = 255 / (levels - 1);

	// Apply Floyd-Steinberg dithering
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const oldPixel = buffer[index];

			// Quantize to nearest level
			const newPixel = Math.round(oldPixel / step) * step;
			result[index] = Math.min(255, Math.max(0, newPixel));

			// Calculate error
			const error = oldPixel - newPixel;

			// Distribute error to neighboring pixels
			if (x + 1 < width) buffer[index + 1] += (error * 7) / 16;
			if (y + 1 < height && x > 0)
				buffer[index + width - 1] += (error * 3) / 16;
			if (y + 1 < height) buffer[index + width] += (error * 5) / 16;
			if (y + 1 < height && x + 1 < width)
				buffer[index + width + 1] += (error * 1) / 16;
		}
	}

	return result;
}

/**
 * Process an image: resize, convert to grayscale, apply dithering
 */
export async function processImage(
	options: ProcessImageOptions,
): Promise<Buffer> {
	const {
		url,
		width,
		height,
		bitDepth = 1,
		fit = "cover",
		invert = false,
		background = "white",
	} = options;

	// Determine port - check common Next.js env vars
	const port = process.env.PORT || 3000;

	// Resolve local paths to full URL
	const resolvedUrl = url.startsWith("http")
		? url
		: `http://127.0.0.1:${port}${url.startsWith("/") ? url : `/${url}`}`;

	// Fetch the source image
	const response = await fetch(resolvedUrl);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch image: ${response.status} ${response.statusText}`,
		);
	}

	const imageBuffer = Buffer.from(await response.arrayBuffer());

	// Process with Sharp
	let pipeline = sharp(imageBuffer);

	// Resize if dimensions provided
	if (width || height) {
		pipeline = pipeline.resize(width, height, {
			fit,
			withoutEnlargement: false,
		});
	}

	// Flatten transparency to background color before grayscale
	pipeline = pipeline.flatten({ background });

	// Convert to grayscale and get raw data
	const { data, info } = await pipeline
		.grayscale()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const imgWidth = info.width;
	const imgHeight = info.height;

	// Calculate number of gray levels from bit depth
	const levels = Math.pow(2, bitDepth);

	// Apply Floyd-Steinberg dithering with evenly spaced levels
	let processedData = applyFloydSteinbergDithering(
		new Uint8Array(data),
		imgWidth,
		imgHeight,
		levels,
	);

	// Apply inversion if requested
	if (invert) {
		for (let i = 0; i < processedData.length; i++) {
			processedData[i] = 255 - processedData[i];
		}
	}

	// Convert back to PNG
	return await sharp(processedData, {
		raw: {
			width: imgWidth,
			height: imgHeight,
			channels: 1,
		},
	})
		.png()
		.toBuffer();
}

/**
 * Fetch original image as fallback
 */
export async function fetchOriginalImage(url: string): Promise<Buffer> {
	const port = process.env.PORT || 3000;

	const resolvedUrl = url.startsWith("http")
		? url
		: `http://127.0.0.1:${port}${url.startsWith("/") ? url : `/${url}`}`;

	const response = await fetch(resolvedUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch original image: ${response.status}`);
	}

	return Buffer.from(await response.arrayBuffer());
}
