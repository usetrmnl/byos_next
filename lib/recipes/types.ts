import type { ComponentType } from "react";
import type { z } from "zod";

export type RecipeAuthor = {
	name?: string;
	github?: string;
};

export type RecipeRenderSettings = {
	doubleSizeForSharperText?: boolean;
	applyEdgeSnap?: boolean;
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
// biome-ignore lint/suspicious/noExplicitAny: registry handles heterogeneous schemas
export type AnyRecipeDefinition = RecipeDefinition<any, any>;

/**
 * Module shape returned by recipe loaders. `definition` is optional during
 * the migration window — un-migrated recipes still load via the legacy
 * renderer (which uses the `default` component export and `screens.json`
 * metadata). Other exports (e.g. `paramsSchema`, `dataSchema`, `default`,
 * helper utilities) are intentionally allowed.
 */
export type RecipeModule = {
	definition?: AnyRecipeDefinition;
	// biome-ignore lint/suspicious/noExplicitAny: recipe modules export arbitrary helpers
	[key: string]: any;
};

/**
 * Lazy module loader produced by the recipe index generator. Each entry
 * dynamic-imports the recipe file.
 */
export type RecipeModuleLoader = () => Promise<RecipeModule>;
