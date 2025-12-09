import { Renderer } from "@takumi-rs/core";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import { cache, createElement } from "react";
import { getScreenParams } from "@/app/actions/screens-params";
import NotFoundScreen from "@/app/recipes/screens/not-found/not-found";
import screens from "@/app/recipes/screens.json";
import { getTakumiFonts } from "@/lib/fonts";
import { DitheringMethod, renderBmp } from "@/utils/render-bmp";

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

// Cache the fonts at module initialization
// Takumi is used for PNG/bitmap generation (replaces Next.js ImageResponse which used Satori)
const takumiFonts = getTakumiFonts();

// Initialize Takumi renderer
// Note: If using a bundler, @takumi-rs/core should be marked as external
// const takumiRenderer = new Renderer({
// 	fonts: takumiFonts,
// });
const takumiRenderer = new Renderer({ fonts: takumiFonts });

async function localFetch(url: string) {
	return {
		arrayBuffer: () =>
			fetch(url)
				.then((res) => res.arrayBuffer())
				.then((ab) => Buffer.from(ab)),
	};
}

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
			`@/app/recipes/screens/${slug}/${slug}.tsx`
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
				`@/app/recipes/screens/${slug}/getData.ts`
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
	}: RenderOptions): Promise<RenderResults> => {
		const results = getDefaultRenderResults();
		const imageOptions = getRecipeImageOptions(config, imageWidth, imageHeight);

		const tasks: Array<
			Promise<{ key: keyof RenderResults; value: Buffer | null }>
		> = [];

		if (formats.includes("bitmap")) {
			tasks.push(
				(async () => {
					try {
						const element = createElement(Component, props);
						const node = await fromJsx(element);
						const png = await takumiRenderer.render(node, {
							width: imageOptions.width,
							height: imageOptions.height,
							format: "png",
							fetch: localFetch,
						});
						const buffer = await renderBmp(png, {
							ditheringMethod: DitheringMethod.ATKINSON,
							width: imageWidth,
							height: imageHeight,
						});
						return { key: "bitmap", value: buffer };
					} catch (error) {
						logger.error(`Error generating bitmap for ${slug}:`, error);
						return { key: "bitmap", value: null };
					}
				})(),
			);
		}

		if (formats.includes("png")) {
			tasks.push(
				(async () => {
					try {
						const element = createElement(Component, props);
						// const element = "<div>Hello, world!</div>";
						const node = await fromJsx(element);

						const pngBuffer = await takumiRenderer.render(node, {
							width: imageOptions.width,
							height: imageOptions.height,
							format: "png",
							fetch: localFetch,
						});
						return { key: "png", value: Buffer.from(pngBuffer) };
					} catch (error) {
						logger.error(`Error generating PNG for ${slug}:`, error);
						return { key: "png", value: null };
					}
				})(),
			);
		}

		const completed = await Promise.all(tasks);
		for (const { key, value } of completed) {
			results[key] = value as never;
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
