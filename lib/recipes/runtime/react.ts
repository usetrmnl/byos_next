import { cache } from "react";
import { z } from "zod";
import { getScreenParams } from "@/app/actions/screens-params";
import { getReactRecipeDefinition } from "@/lib/recipes/registry";
import type { AnyRecipeDefinition } from "@/lib/recipes/types";
import { zodObjectToParamDefinitions } from "@/lib/recipes/zod-form";

/**
 * React-recipe runtime: given a slug + (optional) userId, resolve the
 * recipe's definition, validated user params, and the data the component
 * should render against.
 *
 * The flow is:
 *   1) Look up the recipe in the in-process registry (no DB).
 *   2) Read user-saved overrides from `screen_configs` (the only DB read).
 *   3) Parse those overrides through `paramsSchema` so:
 *        - unknown keys are stripped
 *        - missing keys get their schema default
 *        - shape mismatches fall back to defaults silently (we never throw)
 *   4) If the definition has a `getData(params)`, call it; otherwise the
 *      data IS the params (paramsSchema.parse gives us a fully-defaulted
 *      object).
 *   5) Validate the data through `dataSchema` the same way (defaults +
 *      strip).
 */

export type ResolvedReactRecipe = {
	definition: AnyRecipeDefinition;
	params: Record<string, unknown>;
	data: Record<string, unknown>;
};

const FETCH_TIMEOUT_MS = 10_000;

function safeParseWithDefaults(
	schema: z.ZodObject,
	value: unknown,
): Record<string, unknown> {
	const candidate =
		value && typeof value === "object" && !Array.isArray(value) ? value : {};
	const result = schema.safeParse(candidate);
	if (result.success) return result.data as Record<string, unknown>;
	// Stored shape no longer matches the schema (e.g. field renamed). Fall
	// back to the defaults-only object so the recipe still renders.
	const defaults = schema.safeParse({});
	return defaults.success ? (defaults.data as Record<string, unknown>) : {};
}

function safeParseDataWithDefaults(
	schema: z.ZodTypeAny,
	value: unknown,
): Record<string, unknown> {
	const result = schema.safeParse(value);
	if (result.success) {
		const data = result.data;
		return data && typeof data === "object" && !Array.isArray(data)
			? (data as Record<string, unknown>)
			: {};
	}
	const defaults = schema.safeParse({});
	if (defaults.success) {
		const data = defaults.data;
		return data && typeof data === "object" && !Array.isArray(data)
			? (data as Record<string, unknown>)
			: {};
	}
	return {};
}

async function callGetDataWithTimeout(
	getData: NonNullable<AnyRecipeDefinition["getData"]>,
	params: Record<string, unknown>,
): Promise<unknown> {
	return await Promise.race([
		getData(params),
		new Promise((_, reject) => {
			setTimeout(
				() => reject(new Error("Recipe data fetch timeout")),
				FETCH_TIMEOUT_MS,
			);
		}),
	]);
}

export const resolveReactRecipe = cache(
	async (
		slug: string,
		userId?: string,
	): Promise<ResolvedReactRecipe | null> => {
		const definition = await getReactRecipeDefinition(slug);
		if (!definition) return null;

		// Read user-saved param overrides. Pass paramDefinitions for
		// backwards-compatible filtering — getScreenParams uses keys to
		// gate which fields it returns.
		const paramDefinitions = zodObjectToParamDefinitions(
			definition.paramsSchema,
		);
		const storedOverrides =
			Object.keys(paramDefinitions).length > 0
				? await getScreenParams(slug, paramDefinitions, userId)
				: {};

		const params = safeParseWithDefaults(
			definition.paramsSchema,
			storedOverrides,
		);

		let data: Record<string, unknown>;
		if (definition.getData) {
			try {
				const fetched = await callGetDataWithTimeout(
					definition.getData,
					params,
				);
				data = safeParseDataWithDefaults(definition.dataSchema, fetched);
			} catch (error) {
				console.error(`[recipe:${slug}] getData failed:`, error);
				data = safeParseDataWithDefaults(definition.dataSchema, {});
			}
		} else {
			// No fetch → render against the params themselves (parsed via
			// dataSchema so wrappers around paramsSchema still apply).
			data = safeParseDataWithDefaults(definition.dataSchema, params);
		}

		return { definition, params, data };
	},
);
