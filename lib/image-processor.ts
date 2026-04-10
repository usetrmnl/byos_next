import sharp from "sharp";
import { ditheringFloydSteinberg } from "@/utils/dithering";

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
			background,
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
	let processedData = ditheringFloydSteinberg(
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
