import { type NextRequest, NextResponse } from "next/server";
import { cacheLife } from "next/cache";
import {
	processImage,
	fetchOriginalImage,
	type FitMode,
} from "@/lib/image-processor";

interface ProcessedImageResult {
	data: string; // Base64 encoded
	contentType: string;
	cached: boolean;
}

const getProcessedImage = async (
	url: string,
	width: number | undefined,
	height: number | undefined,
	bitDepth: number | undefined,
	fit: FitMode,
	invert: boolean,
	background: string,
): Promise<ProcessedImageResult> => {
	"use cache";
	cacheLife({
		stale: 3600,
		revalidate: 3600,
		expire: 86400,
	});

	const processedBuffer = await processImage({
		url,
		width,
		height,
		bitDepth: bitDepth as 1 | 2 | 4,
		fit,
		invert,
		background,
	});

	// Convert buffer to base64 string for serialization
	return {
		data: processedBuffer.toString("base64"),
		contentType: "image/png",
		cached: false,
	};
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// Get required URL parameter
		const url = searchParams.get("url");
		if (!url) {
			return NextResponse.json(
				{ error: "Missing required 'url' parameter" },
				{ status: 400 },
			);
		}

		// Parse optional parameters
		const widthParam = searchParams.get("width");
		const heightParam = searchParams.get("height");
		const bitDepthParam = searchParams.get("bitdepth");
		const fitParam = searchParams.get("fit") as FitMode | null;
		const invertParam = searchParams.get("invert") === "true";
		const backgroundParam = searchParams.get("bg") || "white";

		const width = widthParam ? parseInt(widthParam, 10) : undefined;
		const height = heightParam ? parseInt(heightParam, 10) : undefined;
		const rawBitDepth = bitDepthParam ? parseInt(bitDepthParam, 10) : 2;
		const bitDepth: 1 | 2 | 4 = ([1, 2, 4] as const).includes(
			rawBitDepth as 1 | 2 | 4,
		)
			? (rawBitDepth as 1 | 2 | 4)
			: 2;
		const fit = fitParam || "cover";

		// Validate fit mode
		if (!["cover", "contain", "fill"].includes(fit)) {
			return NextResponse.json(
				{ error: "Invalid fit mode. Must be cover, contain, or fill" },
				{ status: 400 },
			);
		}

		// Process the image
		try {
			const result = await getProcessedImage(
				url,
				width,
				height,
				bitDepth,
				fit,
				invertParam,
				backgroundParam,
			);

			// Decode base64 back to buffer
			const imageBuffer = Buffer.from(result.data, "base64");

			return new NextResponse(new Uint8Array(imageBuffer), {
				status: 200,
				headers: {
					"Content-Type": result.contentType,
					"Cache-Control": "public, max-age=3600",
					"X-Image-Processed": "true",
					"X-Image-Bit-Depth": bitDepth.toString(),
				},
			});
		} catch (processError) {
			console.error(
				"Image processing failed, falling back to original:",
				processError,
			);

			// Fallback to original image
			const originalBuffer = await fetchOriginalImage(url);
			return new NextResponse(new Uint8Array(originalBuffer), {
				status: 200,
				headers: {
					"Content-Type": "image/png",
					"Cache-Control": "public, max-age=3600",
					"X-Image-Processed": "false",
					"X-Image-Fallback": "true",
				},
			});
		}
	} catch (error) {
		console.error("Error in image API route:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
