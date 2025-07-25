export const runtime = "nodejs";
// export const revalidate = 15; // This controls the default revalidation time
import { unstable_cacheLife as cacheLife } from "next/cache";

import { ImageResponse } from "next/og";
import { createElement } from "react";
import { renderBmp, DitheringMethod } from "@/utils/render-bmp";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";
// import BitmapText from "@/components/bitmap-font/bitmap-text";
import fontData from "@/components/bitmap-font/bitmap-font.json";
// import simpleText from "@/app/recipes/screens/simple-text/simple-text";

// Constants for cache configuration
const CACHE_STALE_TIME = 20; // seconds
const SIMULATED_DELAY = 2000; // milliseconds

// Flag to identify environment
const IS_DEV = process.env.NODE_ENV === "development";

// Development-only cache
const devCache = IS_DEV
	? new Map<string, { data: Buffer; timestamp: string; expiresAt: number }>()
	: null;

// Function to simulate random errors (10% chance)
function shouldSimulateError() {
	return Math.random() < 0.1; // 10% chance of error for testing
}

// Function to simulate processing delay
async function simulateDelay() {
	await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY));
}

// Function to generate fallback image for errors (only shown on first load with no cache)
async function generateFallbackImage(
	errorMessage: string,
): Promise<{ data: Buffer; timestamp: string }> {
	if (IS_DEV)
		console.log("🔄 Generating fallback image for error:", errorMessage);
	const timestamp = new Date().toISOString();

	// // Create a simple div with error text
	// const element = createElement(
	// 	"div",
	// 	{
	// 		style: {
	// 			display: "flex",
	// 			flexDirection: "column",
	// 			fontSize: 30,
	// 			color: "red",
	// 			background: "#f8f8f8",
	// 			width: "100%",
	// 			height: "100%",
	// 			padding: "50px",
	// 			alignItems: "center",
	// 			justifyContent: "center",
	// 			fontFamily: "system-ui",
	// 			textAlign: "center",
	// 			gap: "20px",
	// 			border: "5px solid red",
	// 		},
	// 	},
	// 	[
	// 		createElement(BitmapText, { text: "Error", fontData }),
	// 		createElement(BitmapText, { text: errorMessage, fontData }),
	// 		createElement(BitmapText, { text: `Time: ${timestamp}`, fontData })
	// 	]
	// );

	// Create a simple div with error text
	const element = createElement(
		"div",
		{
			style: {
				display: "flex",
				flexDirection: "column",
				fontSize: 30,
				color: "red",
				background: "#f8f8f8",
				width: "100%",
				height: "100%",
				padding: "50px",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "system-ui",
				textAlign: "center",
				gap: "20px",
				border: "5px solid red",
			},
		},
		["hello"],
	);

	// Generate the image response
	const imageResponse = new ImageResponse(element, {
		width: 800,
		height: 480,
	});

	// Convert to bitmap using render-bmp
	const buffer = await renderBmp(imageResponse, {
		ditheringMethod: DitheringMethod.ATKINSON,
	});

	if (!buffer) {
		throw new Error("Failed to generate fallback bitmap buffer");
	}

	return {
		data: buffer,
		timestamp,
	};
}

// Function to generate image data
async function generateImageData(slug: string): Promise<{
	data?: Buffer;
	timestamp: string;
	error?: string;
}> {
	try {
		console.log("🔄 Starting image generation for slug:", slug);
		// Simulate processing delay
		await simulateDelay();

		// Simulate random errors
		if (shouldSimulateError()) {
			console.log("🎲 Random error triggered");
			throw new Error("Random error during image generation");
		}

		const timestamp = new Date().toISOString();
		const text = `Current time: ${timestamp}`;
		console.log("📝 Generated text:", text);

		// Create a simple div with the text
		const element = createElement(
			"div",
			{
				style: {
					display: "flex",
					fontSize: 60,
					color: "black",
					background: "white",
					width: "100%",
					height: "100%",
					padding: "50px",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "system-ui",
				},
			},
			[createElement(BitmapText, { text, fontData, scale: 2 })],
		);

		// Generate the image response
		console.log("🎨 Creating ImageResponse");
		const imageResponse = new ImageResponse(element, {
			width: 800,
			height: 480,
		});

		// Convert to bitmap using render-bmp
		console.log("🖼️ Converting to bitmap");
		const buffer = await renderBmp(imageResponse, {
			ditheringMethod: DitheringMethod.ATKINSON,
		});

		if (!buffer) {
			console.error("❌ No buffer returned from renderBmp");
			throw new Error("Failed to generate bitmap buffer");
		}

		console.log("✅ Successfully generated buffer of size:", buffer.length);

		return {
			data: buffer,
			timestamp,
		};
	} catch (error) {
		console.error("❌ Error in generateImageData:", error);
		return {
			error: error instanceof Error ? error.message : "Unknown error",
			timestamp: new Date().toISOString(),
		};
	}
}

// PRODUCTION HANDLERS - using 'use cache' from Next.js
const getCachedImageData = async (slug: string) => {
	"use cache";
	cacheLife({
		stale: CACHE_STALE_TIME,
		revalidate: CACHE_STALE_TIME,
		expire: 86400, // 1 day
	});
	console.log("🔍 Production cache: Generating fresh data for:", slug);
	const result = await generateImageData(slug);

	// Only cache successful results
	if (!result.data || result.error) {
		console.log("❌ Production cache: Not caching error result");
		return { ...result, cached: false };
	}

	console.log("✅ Production cache: Cached successfully");
	return { ...result, cached: true };
};

// DEVELOPMENT HANDLERS - using in-memory Map cache
// Background refresh for development - checks if refresh is needed
async function refreshDevCache(slug: string) {
	try {
		if (!IS_DEV || !devCache) return;

		// Check if refresh is needed
		const cached = devCache.get(slug);
		const now = Date.now();

		// Skip if cache is fresh
		if (cached && cached.expiresAt > now) {
			console.log("🔵 Dev cache is still fresh, skipping refresh");
			return;
		}

		console.log("🔄 Dev cache refresh started for:", slug);
		const result = await generateImageData(slug);

		// Only update cache on success
		if (result.data && !result.error) {
			console.log("✅ Dev cache updated with fresh data");
			devCache.set(slug, {
				data: result.data,
				timestamp: result.timestamp,
				expiresAt: Date.now() + CACHE_STALE_TIME * 1000,
			});
		} else {
			console.log("❌ Dev cache refresh failed, keeping existing cache");
		}
	} catch (error) {
		console.error("❌ Error in dev cache refresh:", error);
	}
}

// Get from dev cache or generate if needed
async function getFromDevCache(slug: string): Promise<{
	data?: Buffer;
	timestamp: string;
	error?: string;
	cached?: boolean;
}> {
	if (!IS_DEV || !devCache) {
		return {
			error: "Dev cache not available",
			timestamp: new Date().toISOString(),
		};
	}

	// Always trigger background refresh - it will decide if needed
	refreshDevCache(slug); // No await - runs in background

	// Check if we have cached data
	const cached = devCache.get(slug);
	if (cached) {
		console.log("🟢 Serving from dev cache");
		return {
			data: cached.data,
			timestamp: cached.timestamp,
			cached: true,
		};
	}

	// No cache yet, generate initial data
	console.log("🟡 No dev cache yet, generating initial data");
	const result = await generateImageData(slug);

	// If successful, cache it
	if (result.data && !result.error) {
		console.log("✅ Caching initial data in dev cache");
		devCache.set(slug, {
			data: result.data,
			timestamp: result.timestamp,
			expiresAt: Date.now() + CACHE_STALE_TIME * 1000,
		});
	}

	return { ...result, cached: false };
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	const resolvedParams = await params;
	const slug = resolvedParams?.slug ? resolvedParams.slug.join("/") : "default";
	if (IS_DEV) console.log("📥 Received request for slug:", slug);

	const requestHeaders = new Headers(request.headers);
	console.log("🔍 Request headers:", requestHeaders);

	try {
		// SIMPLIFIED LOGIC: Get data, using appropriate cache strategy based on environment
		const result =
			IS_DEV && devCache
				? await getFromDevCache(slug)
				: await getCachedImageData(slug);

		// If we have image data, return it immediately
		if (result.data) {
			const source = IS_DEV
				? result.cached
					? "dev-cache"
					: "dev-fresh"
				: result.cached
					? "prod-cache"
					: "prod-fresh";

			if (IS_DEV) console.log(`✅ Returning image from ${source}`);

			// Make sure buffer length exists and is safe to convert
			const contentLength = result.data?.length
				? result.data.length.toString()
				: `${800 * 480}`;

			return new Response(result.data, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": contentLength,
					"X-Image-Timestamp": result.timestamp || new Date().toISOString(),
					"X-Image-Source": source,
					"Cache-Control": "no-cache", // Always check with server
				} as HeadersInit,
			});
		}

		// If generation failed and we have no cache - show error image
		if (IS_DEV) console.log("❌ No image data available, showing error image");
		const fallback = await generateFallbackImage(
			result.error || "Unknown error",
		);

		// Safety check for fallback data
		if (!fallback || !fallback.data) {
			throw new Error("Failed to generate fallback image");
		}

		return new Response(fallback.data, {
			headers: {
				"Content-Type": "image/bmp",
				"Content-Length": fallback.data.length.toString(),
				"X-Image-Timestamp": fallback.timestamp,
				"X-Image-Source": "fallback",
				"X-Image-Error": result.error || "Unknown error",
				"Cache-Control": "no-store",
			} as HeadersInit,
		});
	} catch (error) {
		console.error("❌ Unexpected error in route handler:", error);

		// Show error image
		try {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			if (IS_DEV) console.log("🚨 Critical error, showing error image");
			const fallback = await generateFallbackImage(errorMessage);

			// Final safety check
			if (!fallback || !fallback.data) {
				return new Response(
					`Critical failure: Failed to generate error image`,
					{
						status: 500,
						headers: {
							"Content-Type": "text/plain",
							"Cache-Control": "no-store",
						} as HeadersInit,
					},
				);
			}

			return new Response(fallback.data, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": fallback.data.length.toString(),
					"X-Image-Timestamp": fallback.timestamp || new Date().toISOString(),
					"X-Image-Source": "critical-error",
					"X-Image-Error": errorMessage,
					"Cache-Control": "no-store",
				} as HeadersInit,
			});
		} catch (fallbackError) {
			console.error(
				"💥 Fatal failure - could not generate error image:",
				fallbackError,
			);
			return new Response(
				`Critical failure: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					status: 500,
					headers: {
						"Content-Type": "text/plain",
						"Cache-Control": "no-store",
					} as HeadersInit,
				},
			);
		}
	}
}
