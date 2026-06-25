import type { ComponentType } from "react";
import type { z } from "zod";
import type { ScreenProfile } from "@/lib/trmnl/screen-profile";

export type RecipeAuthor = {
	name?: string;
	github?: string;
};

export type RecipeRenderSettings = {
	/** Opt-in Floyd-Steinberg during device palette quantization (default off). */
	dither?: boolean;
	/** Legacy BMP path only: snap high-contrast edges instead of dithering them. */
	applyEdgeSnap?: boolean;
	/**
	 * Image preparation is enabled by default for reducible device palettes.
	 * Set to false to opt out, or use "floyd-steinberg" for explicitness.
	 */
	imageDither?: false | "floyd-steinberg";
	[key: string]: boolean | string | number | undefined;
};

export type RecipeMeta = {
	slug: string;
	title: string;
	description?: string;
	published?: boolean;
	tags?: string[];
	author?: RecipeAuthor;
	category?: string;
	version?: string;
	createdAt?: string;
	updatedAt?: string;
	renderSettings?: RecipeRenderSettings;
	/**
	 * Hides the recipe from the catalog and parameter form. Used for built-ins
	 * like `not-found` whose props are injected by the runtime, not by users.
	 */
	system?: boolean;
};

export type RecipeRenderProps = {
	width?: number;
	height?: number;
	screen?: ScreenProfile;
};

/**
 * Single source of truth for a built-in React recipe.
 *
 * - `paramsSchema` describes user-configurable inputs (drives the form and
 *   `screen_configs.params` validation). May be `z.object({})` for recipes
 *   with no settings.
 * - `dataSchema` describes the shape the component actually renders against.
 *   For recipes with no fetch, `dataSchema = paramsSchema`. For data-driven
 *   recipes (wikipedia, weather, …), `dataSchema` describes the fetched
 *   payload and `getData(params)` produces it.
 * - `Component` receives `{ width, height, params, data }` so the runtime can
 *   pass both the user's saved params AND the data the component should
 *   render against, without flattening either.
 */
export type RecipeDefinition<
	P extends z.ZodObject = z.ZodObject,
	D extends z.ZodTypeAny = P,
> = {
	meta: RecipeMeta;
	paramsSchema: P;
	dataSchema: D;
	getData?: (params: z.infer<P>) => Promise<z.infer<D>>;
	Component: ComponentType<
		RecipeRenderProps & {
			params: z.infer<P>;
			data: z.infer<D>;
		}
	>;
};

/**
 * Loosely typed alias used by registry code that handles arbitrary
 * definitions without knowing each recipe's schema generics.
 */
export type AnyRecipeDefinition = RecipeDefinition<any, any>;

/**
 * Module shape returned by recipe loaders. The runtime requires
 * `definition` — recipes without one are flagged at load time. Arbitrary
 * other exports (helpers, the legacy `default` component) are allowed
 * because recipe files are free to expose internal symbols.
 */
export type RecipeModule = {
	definition?: AnyRecipeDefinition;
	[key: string]: any;
};

/**
 * Lazy module loader produced by the recipe index generator. Each entry
 * dynamic-imports the recipe file.
 */
export type RecipeModuleLoader = () => Promise<RecipeModule>;
