"use server";

import { sql } from "kysely";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/get-user";
import type { JsonObject } from "@/lib/database/db.d";
import { withExplicitUserScope, withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	customFieldsToParamDefinitions,
	fetchLiquidRecipeSettings,
} from "@/lib/recipes/liquid-renderer";
import { getReactRecipeDefinition } from "@/lib/recipes/registry";
import type { RecipeParamDefinitions } from "@/lib/recipes/zod-form";

export type UpdateScreenParamsResult =
	| { success: true }
	| { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Persist user-saved parameter overrides for a recipe.
 *
 * For React recipes the recipe's own `paramsSchema` is the trust boundary
 * — values that don't validate are returned to the client as per-field
 * errors. For liquid recipes (which don't have a Zod schema) we fall back
 * to the existing custom_fields allowlist so unknown keys are stripped.
 */
export async function updateScreenParams(
	slug: string,
	params: Record<string, unknown>,
): Promise<UpdateScreenParamsResult> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return { success: false, error: "Database client not initialized" };
	}

	const userId = await getCurrentUserId();
	if (!userId) {
		return { success: false, error: "You must be signed in to save params" };
	}

	let sanitizedParams: Record<string, unknown>;

	const reactDefinition = await getReactRecipeDefinition(slug);
	if (reactDefinition) {
		const cleaned = stripEmptyStrings(params);
		const result = reactDefinition.paramsSchema.safeParse(cleaned);
		if (!result.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const path = issue.path.join(".");
				if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
			}
			return {
				success: false,
				error: "Some fields failed validation",
				fieldErrors,
			};
		}
		sanitizedParams = result.data as Record<string, unknown>;
	} else {
		// Liquid path — apply the legacy allowlist from custom_fields.
		const settings = await fetchLiquidRecipeSettings(slug, userId);
		const definitions = settings?.custom_fields?.length
			? customFieldsToParamDefinitions(settings.custom_fields)
			: null;
		sanitizedParams = applyDefinitionAllowlist(params, definitions);
	}

	const now = new Date().toISOString();

	try {
		await withUserScope((scopedDb) =>
			scopedDb
				.insertInto("screen_configs")
				.values({
					screen_id: slug,
					params: sanitizedParams as JsonObject,
					created_at: now,
					updated_at: now,
					user_id: userId,
				})
				.onConflict((oc) =>
					oc
						.columns(["screen_id", "user_id"])
						.where("user_id", "is not", null)
						.doUpdateSet({
							params: sanitizedParams as JsonObject,
							updated_at: now,
						}),
				)
				.execute(),
		);
		revalidatePath(`/recipes/${slug}`);
		revalidatePath(`/api/bitmap/${slug}.bmp`);
		return { success: true };
	} catch (error) {
		console.error("Failed to save screen params", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Read user-saved parameter overrides for a recipe.
 *
 * `definitions` is optional. When provided, it controls which keys are
 * returned and supplies fallback defaults — used by the legacy form path
 * and by liquid recipes. The React recipe runtime calls this without
 * definitions and validates via the recipe's own paramsSchema.
 */
export async function getScreenParams(
	slug: string,
	definitions?: RecipeParamDefinitions,
	userId?: string,
): Promise<Record<string, unknown>> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return definitionDefaults(definitions);
	}

	const query = (
		scopedDb: Parameters<Parameters<typeof withUserScope>[0]>[0],
	) =>
		scopedDb
			.selectFrom("screen_configs")
			.select(["params"])
			.where("screen_id", "=", slug)
			.orderBy(
				sql`CASE WHEN user_id = current_setting('app.current_user_id', true) THEN 0 ELSE 1 END`,
			)
			.executeTakeFirst();

	const row = userId
		? await withExplicitUserScope(userId, query)
		: await withUserScope(query);

	const rawParams = row?.params ?? {};
	const parsedParams =
		typeof rawParams === "string"
			? (JSON.parse(rawParams) as JsonObject)
			: (rawParams as JsonObject);

	if (!definitions) return (parsedParams as Record<string, unknown>) ?? {};

	const merged: Record<string, unknown> = {};
	for (const [key, definition] of Object.entries(definitions)) {
		const incoming = parsedParams?.[key];
		if (
			incoming !== undefined &&
			incoming !== null &&
			!(typeof incoming === "string" && incoming.trim() === "")
		) {
			merged[key] = incoming;
		} else if (definition.default !== undefined) {
			merged[key] = definition.default;
		}
	}
	return merged;
}

function definitionDefaults(
	definitions?: RecipeParamDefinitions,
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};
	if (!definitions) return defaults;
	for (const [key, def] of Object.entries(definitions)) {
		if (def.default !== undefined) defaults[key] = def.default;
	}
	return defaults;
}

function stripEmptyStrings(
	input: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (typeof value === "string" && value.trim() === "") continue;
		out[key] = value;
	}
	return out;
}

function applyDefinitionAllowlist(
	input: Record<string, unknown>,
	definitions: RecipeParamDefinitions | null,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (!definitions) {
		Object.assign(out, input);
		return out;
	}
	for (const key of Object.keys(definitions)) {
		if (input[key] !== undefined) out[key] = input[key];
	}
	return out;
}
