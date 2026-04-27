import { sql } from "kysely";
import { connection } from "next/server";
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
	category?: string;
	version?: string;
	[key: string]: unknown;
};

const DEV_SYNC_INTERVAL_MS = 1000;

let devSyncPromise: Promise<void> | null = null;
let lastDevSyncAt = 0;

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
		// Store the full screens.json config as metadata so the renderer can
		// read it from the DB instead of importing screens.json at runtime.
		const metadata = JSON.stringify(config);

		await db
			.insertInto("recipes")
			.values({
				slug,
				type: sql`'react'::recipe_type`,
				name: config.title,
				description: config.description ?? null,
				author: config.author?.name ?? null,
				author_github: config.author?.github ?? null,
				category: config.category ?? null,
				version: config.version ?? null,
				user_id: null,
				metadata,
			} as never)
			.onConflict((oc) =>
				oc
					.columns(["slug"])
					.where("user_id", "is", null)
					.doUpdateSet({
						name: config.title,
						description: config.description ?? null,
						author: config.author?.name ?? null,
						author_github: config.author?.github ?? null,
						category: config.category ?? null,
						version: config.version ?? null,
						metadata,
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

/**
 * Keep the DB-backed recipe catalog in sync with local React screens during
 * development, without adding request-time writes in production.
 */
export async function syncReactRecipesInDevelopment(): Promise<void> {
	if (process.env.NODE_ENV !== "development") return;

	await connection();

	const now = Date.now();
	if (devSyncPromise) {
		await devSyncPromise;
		return;
	}
	if (now - lastDevSyncAt < DEV_SYNC_INTERVAL_MS) return;

	lastDevSyncAt = now;
	devSyncPromise = syncReactRecipes()
		.then(() => undefined)
		.catch((error) => {
			console.warn("[syncReactRecipes] Dev auto-sync failed", error);
		})
		.finally(() => {
			devSyncPromise = null;
		});

	await devSyncPromise;
}
