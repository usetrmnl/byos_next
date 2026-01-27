"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/get-user";
import type { JsonObject } from "@/lib/database/db.d";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import type { RecipeParamDefinitions } from "@/lib/recipes/recipe-renderer";

/**
 *
 * @param slug - The slug of the screen to update
 * @param params - The parameters to update
 * @param definitions - The definitions of the parameters
 * @returns A promise that resolves to an object with a success property and an error property if the update failed
 */
export async function updateScreenParams(
	slug: string,
	params: Record<string, unknown>,
	definitions?: RecipeParamDefinitions,
) {
	"use server";
	const { ready } = await checkDbConnection();
	if (!ready) {
		return { success: false, error: "Database client not initialized" };
	}

	// Filter params to only include those in definitions
	const sanitizedParams: Record<string, unknown> = {};
	if (definitions) {
		for (const key of Object.keys(definitions)) {
			if (params[key] !== undefined) {
				sanitizedParams[key] = params[key];
			}
		}
	} else {
		Object.assign(sanitizedParams, params);
	}

	const now = new Date().toISOString();
	const userId = await getCurrentUserId();

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
					oc.column("screen_id").doUpdateSet({
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
 * Get the screen params from the database
 * @param slug - The slug of the screen to get the params for
 * @param definitions - The definitions of the parameters
 * @returns A promise that resolves to an object with the parameters
 */
export async function getScreenParams(
	slug: string,
	definitions?: RecipeParamDefinitions,
): Promise<Record<string, unknown>> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		const params: Record<string, unknown> = {};
		if (definitions) {
			for (const [key, definition] of Object.entries(definitions)) {
				if (definition.default !== undefined) {
					params[key] = definition.default;
				}
			}
		}
		return params;
	}

	const row = await withUserScope((scopedDb) =>
		scopedDb
			.selectFrom("screen_configs")
			.select(["params"])
			.where("screen_id", "=", slug)
			.executeTakeFirst(),
	);

	const rawParams = row?.params ?? {};
	const parsedParams =
		typeof rawParams === "string"
			? (JSON.parse(rawParams) as JsonObject)
			: (rawParams as JsonObject);

	const merged: Record<string, unknown> = {};
	if (definitions) {
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
	} else {
		return parsedParams ?? {};
	}

	return merged;
}
