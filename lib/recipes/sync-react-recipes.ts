import { sql } from "kysely";
import { withSharedRecipeSeed } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { reactRecipeLoaders } from "./screens.generated";

/**
 * Seed the `recipes` table from the in-process React recipe registry.
 *
 * The DB row exists only as a stable identity for foreign keys
 * (`mixup_slots.recipe_id`, etc.) and as a catalog row for the sidebar.
 * The runtime metadata (title, description, paramsSchema, …) is read
 * directly from each recipe's `definition` export. The database row is an
 * identity and catalog projection, not a runtime source of truth.
 *
 * This is invoked by `instrumentation.ts` once per server process after boot.
 * There is no request-time sync.
 */
export async function syncReactRecipes(): Promise<{
	synced: number;
}> {
	const dbStatus = await checkDbConnection();
	if (!dbStatus.ready) {
		console.warn(
			`[syncReactRecipes] Skipping recipe sync: ${dbStatus.error ?? "database not available"}`,
		);
		return { synced: 0 };
	}

	// Built-in recipes are owned by NO user (`user_id IS NULL`). Under RLS the
	// regular byos_app role can't INSERT/UPDATE those rows because the standard
	// policies require ownership; we run the seed under the dedicated
	// `app.shared_recipe_seed` policy added in migration 0016 so the privileged
	// hole is opened only for this code path and only for shared rows.
	const synced = await withSharedRecipeSeed(async (scopedDb) => {
		let count = 0;
		for (const slug of Object.keys(reactRecipeLoaders)) {
			const mod = await reactRecipeLoaders[slug]();
			const definition = mod.definition;
			if (!definition) {
				console.warn(
					`[syncReactRecipes] Skipping ${slug} — no \`definition\` export.`,
				);
				continue;
			}

			const meta = definition.meta;
			await scopedDb
				.insertInto("recipes")
				.values({
					slug,
					type: sql`'react'::recipe_type`,
					name: meta.title,
					description: meta.description ?? null,
					author: meta.author?.name ?? null,
					author_github: meta.author?.github ?? null,
					category: meta.category ?? null,
					version: meta.version ?? null,
					user_id: null,
					metadata: null,
				} as never)
				.onConflict((oc) =>
					oc
						.columns(["slug"])
						.where("user_id", "is", null)
						.doUpdateSet({
							name: meta.title,
							description: meta.description ?? null,
							author: meta.author?.name ?? null,
							author_github: meta.author?.github ?? null,
							category: meta.category ?? null,
							version: meta.version ?? null,
							metadata: null,
							updated_at: new Date().toISOString(),
						} as never),
				)
				.execute();

			count++;
		}
		return count;
	});

	console.log(`[syncReactRecipes] Synced ${synced} recipes`);

	return { synced };
}
