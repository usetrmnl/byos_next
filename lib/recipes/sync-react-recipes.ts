import { sql } from "kysely";
import screens from "@/app/(app)/recipes/screens.json";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";

type ScreenConfig = {
	title: string;
	published: boolean;
	description?: string;
	author?: {
		name?: string;
		github?: string;
	};
	[key: string]: unknown;
};

/**
 * Upsert all react recipes from screens.json into the recipes table.
 * Recipes are inserted with user_id = NULL (global/shared).
 * After syncing, backfills mixup_slots.recipe_id from recipe_slug.
 */
export async function syncReactRecipes(): Promise<{
	synced: number;
	backfilled: number;
}> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		console.warn("[syncReactRecipes] Database not available");
		return { synced: 0, backfilled: 0 };
	}

	const entries = Object.entries(screens as Record<string, ScreenConfig>);

	let synced = 0;

	for (const [slug, config] of entries) {
		await db
			.insertInto("recipes")
			.values({
				slug,
				type: sql`'react'::recipe_type`,
				name: config.title,
				description: config.description ?? null,
				author: config.author?.name ?? null,
				author_github: config.author?.github ?? null,
				user_id: null,
			} as never)
			.onConflict((oc) =>
				oc.column("slug").doUpdateSet({
					name: config.title,
					description: config.description ?? null,
					author: config.author?.name ?? null,
					author_github: config.author?.github ?? null,
					updated_at: new Date().toISOString(),
				} as never),
			)
			.execute();

		synced++;
	}

	// Backfill mixup_slots.recipe_id from recipe_slug
	const backfillResult = await sql`
		UPDATE mixup_slots
		SET recipe_id = recipes.id
		FROM recipes
		WHERE recipes.slug = mixup_slots.recipe_slug
		AND mixup_slots.recipe_id IS NULL
	`.execute(db);

	const backfilled = Number(backfillResult.numAffectedRows ?? 0);

	console.log(
		`[syncReactRecipes] Synced ${synced} recipes, backfilled ${backfilled} mixup slots`,
	);

	return { synced, backfilled };
}
