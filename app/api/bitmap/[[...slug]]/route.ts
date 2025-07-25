export const runtime = "nodejs";
export const revalidate = 60;

import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { createElement, cache } from "react";
import { renderBmp, DitheringMethod } from "@/utils/render-bmp";
import NotFoundScreen from "@/app/recipes/screens/not-found/not-found";
import screens from "@/app/recipes/screens.json";
import loadFont from "@/utils/font-loader";

// Generate static params for the bitmap route
export async function generateStaticParams() {
	const staticParams = [
		...Object.keys(screens).map((screen) => ({
			slug: [`${screen}.bmp`],
		})),
	];
	return staticParams;
}

// Logging utility to control log output based on environment
const logger = {
	info: (message: string) => {
		if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
			console.log(message);
		}
	},
	error: (message: string, error?: unknown) => {
		if (error) {
			console.error(message, error);
		} else {
			console.error(message);
		}
	},
	success: (message: string) => {
		if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
			console.log(`✅ ${message}`);
		}
	},
	warn: (message: string, error?: unknown) => {
		if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
			if (error) {
				console.warn(message, error);
			} else {
				console.warn(message);
			}
		}
	},
};

// Define types for our cache
interface CacheItem {
	data: Buffer;
	expiresAt: number;
}

// Extend NodeJS namespace for global variables
declare global {
	// eslint-disable-next-line no-var
	var bitmapCache: Map<string, CacheItem> | undefined;
}

// Use the global bitmap cache only in development
const getBitmapCache = (): Map<string, CacheItem> | null => {
	// Check for forced cache usage via environment variable
	const forceBitmapCache = process.env.FORCE_BITMAP_CACHE === "true";

	// In production, return null unless forced
	if (process.env.NODE_ENV === "production" && !forceBitmapCache) {
		return null;
	}

	// Use global cache in development or when forced in production
	if (!global.bitmapCache) {
		global.bitmapCache = new Map<string, CacheItem>();
		logger.info(
			`Initializing bitmap cache (${process.env.NODE_ENV} mode${forceBitmapCache ? ", forced" : ""})`,
		);
	}
	return global.bitmapCache;
};

// Cache the fonts at module initialization
const fonts = loadFont();

// Get image options based on recipe configuration
const getImageOptions = (recipeId: string) => {
	// Check if the recipe exists and has doubleSizeForSharperText setting
	const config = screens[recipeId as keyof typeof screens];

	// Perform thorough type checking for nested properties
	let useDoubling = false;
	if (
		config &&
		"renderSettings" in config &&
		config.renderSettings &&
		typeof config.renderSettings === "object" &&
		"doubleSizeForSharperText" in config.renderSettings
	) {
		useDoubling = Boolean(config.renderSettings.doubleSizeForSharperText);
	}

	const scaleFactor = useDoubling ? 2 : 1;

	return {
		width: 800 * scaleFactor,
		height: 480 * scaleFactor,
		fonts: [
			...(fonts?.blockKie
				? [
						{
							name: "BlockKie",
							data: fonts.blockKie,
							weight: 400 as const,
							style: "normal" as const,
						},
					]
				: []),
			...(fonts?.geneva9
				? [
						{
							name: "Geneva9",
							data: fonts.geneva9,
							weight: 400 as const,
							style: "normal" as const,
						},
					]
				: []),
		],
		debug: false,
	};
};

// Helper function to load a recipe component - now using React's cache
const loadRecipeBuffer = cache(async (recipeId: string) => {
	try {
		// Check if the recipe exists in our components registry
		let element: React.ReactNode;
		if (screens[recipeId as keyof typeof screens]) {
			const { default: Component } = await import(
				`@/app/recipes/screens/${recipeId}/${recipeId}.tsx`
			);
			logger.info(`Recipe component loaded: ${recipeId}`);
			let props = screens[recipeId as keyof typeof screens].props || {};
			let hasValidData = true; // Track if we have valid data for data-fetching recipes

			// Handle data fetching recipes
			if (screens[recipeId as keyof typeof screens].hasDataFetch) {
				try {
					const { default: fetchDataFunction } = await import(
						`@/app/recipes/screens/${recipeId}/getData.ts`
					);

					// Set a timeout for data fetching to prevent hanging
					const fetchPromise = fetchDataFunction();
					const timeoutPromise = new Promise((_, reject) => {
						setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
					});

					// Race between the fetch and the timeout
					const fetchedData = await Promise.race([
						fetchPromise,
						timeoutPromise,
					]).catch((error) => {
						logger.warn(`Data fetch error for ${recipeId}:`, error);
						return null;
					});

					// Check if the fetched data is valid and has required fields
					if (fetchedData && typeof fetchedData === "object") {
						// For Wikipedia specifically, ensure we have valid data
						if (recipeId === "wikipedia") {
							const hasValidTitle =
								fetchedData.title &&
								typeof fetchedData.title === "string" &&
								fetchedData.title !== "no data received" &&
								fetchedData.title.trim().length > 0;

							const hasValidExtract =
								fetchedData.extract &&
								typeof fetchedData.extract === "string" &&
								fetchedData.extract !== "Article content is unavailable." &&
								fetchedData.extract.trim().length > 0;

							if (hasValidTitle && hasValidExtract) {
								props = fetchedData;
								logger.success(`Valid Wikipedia data loaded for ${recipeId}`);
							} else {
								logger.warn(
									`Invalid Wikipedia data for ${recipeId} - missing required fields`,
								);
								hasValidData = false; // Mark as invalid to use NotFoundScreen
							}
						} else {
							// For other recipes, use the data as-is
							props = fetchedData;
						}
					} else {
						logger.warn(`Invalid or missing data for ${recipeId}`);
						hasValidData = false; // Mark as invalid to use NotFoundScreen
					}
				} catch (error) {
					logger.warn(`Error in data fetching for ${recipeId}:`, error);
					hasValidData = false; // Mark as invalid to use NotFoundScreen
				}
			}

			// Only render the component if we have valid data, otherwise use NotFoundScreen
			if (hasValidData) {
				element = createElement(Component, { ...props });
			} else {
				logger.info(`Using NotFoundScreen for ${recipeId} due to invalid data`);
				element = createElement(NotFoundScreen, {
					slug: `${recipeId} - Data Unavailable`,
				});
			}
		} else {
			// If recipe component not found, use the NotFoundScreen
			element = createElement(NotFoundScreen, { slug: recipeId });
		}

		// Use recipe-specific image options
		const pngResponse = await new ImageResponse(
			element,
			getImageOptions(recipeId),
		);
		return await renderBmp(pngResponse, {
			ditheringMethod: DitheringMethod.ATKINSON,
		});
	} catch (error) {
		logger.error(`Error loading recipe component ${recipeId}:`, error);
		// Return an empty buffer instead of null to prevent undefined errors
		return Buffer.from([]);
	}
});

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> },
) {
	try {
		// Always await params as required by Next.js 14/15
		const { slug = ["not-found"] } = await params;
		const bitmapPath = Array.isArray(slug) ? slug.join("/") : slug;
		const cacheKey = `api/bitmap/${bitmapPath}`;

		logger.info(`Bitmap request for: ${bitmapPath}`);

		// Get the bitmap cache (will be null in production)
		const bitmapCache = getBitmapCache();

		// Only check cache in development
		if (bitmapCache?.has(cacheKey)) {
			const item = bitmapCache.get(cacheKey);
			// Since we've checked with .has(), item should exist, but let's be safe
			if (!item) {
				logger.warn(`Cache inconsistency for ${cacheKey}`);
				return await generateBitmap(bitmapPath, cacheKey);
			}

			const now = Date.now();

			// Check if the item is still valid
			if (item.expiresAt > now) {
				logger.info(`🔵 Global cache HIT for ${cacheKey}`);
				return new Response(item.data, {
					headers: {
						"Content-Type": "image/bmp",
						"Content-Length": item.data.length.toString(),
					},
				});
			}

			logger.info(`🟡 Global cache STALE for ${cacheKey}`);
			// Return stale data but trigger background revalidation
			const staleResponse = new Response(item.data, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": item.data.length.toString(),
				},
			});

			// Revalidate in background with a fresh AbortController
			setTimeout(() => {
				logger.info(`🔄 Background revalidation for ${cacheKey}`);
				generateBitmap(bitmapPath, cacheKey);
			}, 0);

			return staleResponse;
		}

		// Cache miss or in production - generate the bitmap
		return await generateBitmap(bitmapPath, cacheKey);
	} catch (error) {
		logger.error("Error generating image:", error);

		// Instead of returning an error, return the NotFoundScreen as a fallback
		try {
			// Only load fonts when needed for error fallback
			const element = createElement(NotFoundScreen, { slug: "Error occurred" });
			// Use default options for error screen
			const defaultOptions = {
				width: 800,
				height: 480,
				fonts: [
					...(fonts?.blockKie
						? [
								{
									name: "BlockKie",
									data: fonts.blockKie,
									weight: 400 as const,
									style: "normal" as const,
								},
							]
						: []),
					...(fonts?.geneva9
						? [
								{
									name: "Geneva9",
									data: fonts.geneva9,
									weight: 400 as const,
									style: "normal" as const,
								},
							]
						: []),
				],
				debug: false,
			};
			const pngResponse = await new ImageResponse(element, defaultOptions);
			const buffer = await renderBmp(pngResponse);

			return new Response(buffer, {
				headers: {
					"Content-Type": "image/bmp",
					"Content-Length": buffer.length.toString(),
				},
			});
		} catch (fallbackError) {
			logger.error("Error generating fallback image:", fallbackError);
			return new Response("Error generating image", {
				status: 500,
				headers: {
					"Content-Type": "text/plain",
				},
			});
		}
	}
}

// Helper function to generate and cache bitmap
const generateBitmap = cache(async (bitmapPath: string, cacheKey: string) => {
	// Extract the recipe slug from the URL
	// Format: [recipe_slug].bmp
	const recipeSlug = bitmapPath.replace(".bmp", "");

	// Default to 'simple-text' if no recipe is specified
	let recipeId = "simple-text";

	// Check if the requested recipe exists in our screens registry
	if (screens[recipeSlug as keyof typeof screens]) {
		recipeId = recipeSlug;
		logger.info(`Recipe found: ${recipeSlug}`);
	} else {
		logger.info(`Recipe not found: ${recipeSlug}, using default`);
	}

	// Try to load the recipe component using our cached function
	const recipeBuffer = await loadRecipeBuffer(recipeId);

	// Safety check for buffer presence and non-empty
	if (
		!recipeBuffer ||
		!(recipeBuffer instanceof Buffer) ||
		recipeBuffer.length === 0
	) {
		logger.error(`Failed to generate valid buffer for ${recipeId}`);
		throw new Error("Failed to generate recipe buffer");
	}

	const revalidate = 60;
	const now = Date.now();
	const expiresAt = now + revalidate * 1000;

	// Only cache in development
	const bitmapCache = getBitmapCache();
	if (bitmapCache) {
		bitmapCache.set(cacheKey, {
			data: recipeBuffer,
			expiresAt,
		});
	}

	logger.success(`Successfully generated bitmap for: ${bitmapPath}`);

	return new Response(recipeBuffer, {
		headers: {
			"Content-Type": "image/bmp",
			"Content-Length": recipeBuffer.length.toString(),
		},
	});
});
