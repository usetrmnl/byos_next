import React, { cache, createElement } from "react";
import NotFoundScreen from "@/app/(app)/recipes/screens/not-found/not-found";
import screens from "@/app/(app)/recipes/screens.json";
import { getScreenParams } from "@/app/actions/screens-params";
import sharp from "sharp";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";
import { renderWithTakumi } from "./renderers/takumi";
import { renderWithSatori } from "./renderers/satori";

// Logging utility shared between recipe renderers
export const logger = {
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

export type ComponentProps = Record<string, unknown> & {
	width?: number;
	height?: number;
};

export type RecipeParamType = "string" | "number" | "boolean";

export type RecipeParamDefinition = {
	label: string;
	type: RecipeParamType;
	description?: string;
	default?: unknown;
	placeholder?: string;
};

export type RecipeParamDefinitions = Record<string, RecipeParamDefinition>;

export type RecipeConfig = (typeof screens)[keyof typeof screens] & {
	renderSettings?: {
		doubleSizeForSharperText?: boolean;
		applyEdgeSnap?: boolean;
		[key: string]: boolean | string | number | undefined;
	};
	params?: RecipeParamDefinitions;
};

// Re-export constants from shared file
export { DEFAULT_IMAGE_HEIGHT, DEFAULT_IMAGE_WIDTH } from "./constants";

// Utility to check if we're in build phase
export const isBuildPhase = (): boolean =>
	process.env.NEXT_PHASE === "phase-production-build";

// Helper to add dimensions to props
export const addDimensionsToProps = (
	props: ComponentProps,
	width: number,
	height: number,
): ComponentProps => ({
	...props,
	width,
	height,
});

// Get renderer type from environment variable (defaults to "takumi")
export const getRendererType = (): "takumi" | "satori" | "browser" => {
	const renderer = process.env.REACT_RENDERER?.toLowerCase();
	if (renderer === "satori") return "satori";
	if (renderer === "browser") return "browser";
	return "takumi";
};

export const fetchRecipeConfig = cache((slug: string): RecipeConfig | null => {
	const config = screens[slug as keyof typeof screens];
	if (!config || (!config.published && process.env.NODE_ENV === "production")) {
		return null;
	}
	return config as RecipeConfig;
});

export const fetchRecipeComponent = cache(async (slug: string) => {
	try {
		const { default: Component } = await import(
			`@/app/(app)/recipes/screens/${slug}/${slug}.tsx`
		);
		return Component;
	} catch (error) {
		logger.error(`Error loading component for ${slug}:`, error);
		return null;
	}
});

type FetchPropsOptions = {
	validateFetchedData?: (slug: string, data: unknown) => boolean;
};

export const fetchRecipeProps = cache(
	async (
		slug: string,
		config: RecipeConfig,
		options?: FetchPropsOptions,
	): Promise<ComponentProps> => {
		const params = config.params
			? await getScreenParams(slug, config.params)
			: {};

		let props: ComponentProps = {
			...(config.props || {}),
			...(Object.keys(params).length > 0 ? { params } : {}),
		};

		if (isBuildPhase()) {
			return props;
		}

		if (!config.hasDataFetch) {
			return props;
		}

		try {
			const { default: fetchDataFunction } = (await import(
				`@/app/(app)/recipes/screens/${slug}/getData.ts`
			)) as {
				default: (params?: Record<string, unknown>) => Promise<ComponentProps>;
			};

			// Set a timeout for data fetching to prevent hanging
			const fetchPromise = fetchDataFunction(params);
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
			});

			// Race between the fetch and the timeout
			const fetchedData = await Promise.race([
				fetchPromise,
				timeoutPromise,
			]).catch((error) => {
				logger.error(`Data fetch error for ${slug}:`, error);
				return null;
			});

			// Validate fetched data when a validator is provided
			const isValid =
				fetchedData &&
				typeof fetchedData === "object" &&
				(!options?.validateFetchedData ||
					options.validateFetchedData(slug, fetchedData));

			if (isValid) {
				props = fetchedData as ComponentProps;
			} else {
				logger.warn(`Invalid or missing data for ${slug}`);
			}
		} catch (error) {
			logger.error(`Error fetching data for ${slug}:`, error);
		}

		return props;
	},
);

export const getRecipeImageOptions = (
	config: RecipeConfig | null,
	width: number,
	height: number,
) => {
	const useDoubling = config?.renderSettings?.doubleSizeForSharperText ?? false;
	const scaleFactor = useDoubling ? 2 : 1;

	return {
		width: width * scaleFactor,
		height: height * scaleFactor,
	};
};

type RenderFormats = Array<"bitmap" | "png">;

type RenderOptions = {
	slug: string;
	Component: React.ComponentType<ComponentProps>;
	props: ComponentProps;
	config: RecipeConfig | null;
	imageWidth: number;
	imageHeight: number;
	formats?: RenderFormats;
	grayscale?: number; // Number of gray levels: 2, 4, or 16
};

type RenderResults = {
	bitmap: Buffer | null;
	png: Buffer | null;
};

const getDefaultRenderResults = (): RenderResults => ({
	bitmap: null,
	png: null,
});

export const renderRecipeOutputs = cache(
	async ({
		slug,
		Component,
		props,
		config,
		imageWidth,
		imageHeight,
		formats = ["bitmap", "png"],
		grayscale,
	}: RenderOptions): Promise<RenderResults> => {
		const results = getDefaultRenderResults();
		const needsPng = formats.includes("png");
		const needsBitmap = formats.includes("bitmap");

		if (!needsPng && !needsBitmap) return results;

		const rendererType = getRendererType();

		// Render PNG once — reused for both png and bitmap outputs
		const imageOptions = getRecipeImageOptions(config, imageWidth, imageHeight);
		let png: Buffer;
		try {
			if (rendererType === "browser") {
				const { renderWithBrowser } = await import("./renderers/browser").catch(
					() => {
						throw new Error(
							"Browser renderer requires one of: " +
								"(1) BROWSER_WS_ENDPOINT for a remote Chrome container, " +
								"(2) puppeteer-core + CHROME_EXECUTABLE_PATH for a local Chrome install, " +
								"(3) puppeteer for bundled Chrome (pnpm add puppeteer).",
						);
					},
				);
				const scaleFactor = imageOptions.width / imageWidth;
				png = await renderWithBrowser(
					slug,
					imageWidth,
					imageHeight,
					scaleFactor,
				);
			} else {
				const element = createElement(Component, props);
				png =
					rendererType === "satori"
						? await renderWithSatori(
								element,
								imageOptions.width,
								imageOptions.height,
							)
						: await renderWithTakumi(
								element,
								imageOptions.width,
								imageOptions.height,
							);
			}
		} catch (error) {
			logger.error(`Error rendering PNG for ${slug}:`, error);
			return results;
		}

		if (needsPng) {
			results.png =
				imageOptions.width !== imageWidth
					? await sharp(png).resize(imageWidth, imageHeight).png().toBuffer()
					: png;
		}

		if (needsBitmap) {
			try {
				results.bitmap = await renderBmp(png, {
					ditheringMethod: DitheringMethod.FLOYD_STEINBERG,
					width: imageWidth,
					height: imageHeight,
					applyEdgeSnap: config?.renderSettings?.applyEdgeSnap ?? true,
					...(grayscale !== undefined && { grayscale }),
				});
			} catch (error) {
				logger.error(`Error generating bitmap for ${slug}:`, error);
			}
		}

		return results;
	},
);

export const buildRecipeElement = async ({
	slug,
	validateProps,
}: {
	slug: string;
	validateProps?: (slug: string, props: ComponentProps) => boolean;
}) => {
	const config = fetchRecipeConfig(slug);
	const Component = config ? await fetchRecipeComponent(slug) : null;

	if (!config || !Component) {
		return {
			config,
			Component: null,
			props: {},
			element: createElement(NotFoundScreen, { slug }),
		};
	}

	const props = await fetchRecipeProps(slug, config, {
		validateFetchedData: validateProps
			? (slug: string, data: unknown) => {
					return (
						typeof data === "object" &&
						data !== null &&
						validateProps(slug, data as ComponentProps)
					);
				}
			: undefined,
	});

	if (validateProps && !validateProps(slug, props)) {
		return {
			config,
			Component: null,
			props,
			element: createElement(NotFoundScreen, { slug }),
		};
	}

	return {
		config,
		Component,
		props,
		element: createElement(Component, props),
	};
};
