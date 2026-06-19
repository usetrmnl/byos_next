import { sql } from "kysely";
import { db } from "@/lib/database/db";
import { withSharedRecipeSeed } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { reactRecipeLoaders } from "./screens.generated";
import type { AnyRecipeDefinition } from "./types";

/**
 * Seed the `recipes` table from the in-process React recipe registry.
 *
 * The DB row exists only as a stable identity for foreign keys
 * (`mixup_slots.recipe_id`, etc.) and as a catalog row for the sidebar.
 * The runtime metadata (title, description, paramsSchema, …) is read
 * directly from each recipe's `definition` export, NOT from
 * `recipes.metadata`. We still write a metadata blob for legacy callers
 * and to keep the catalog query simple.
 *
 * This is invoked by `instrumentation.ts` once per server process after boot.
 * There is no request-time sync.
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
			const metadata = JSON.stringify(buildLegacyMetadata(definition));

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
					metadata,
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
							metadata,
							updated_at: new Date().toISOString(),
						} as never),
				)
				.execute();

			count++;
		}
		return count;
	});

	// Mixup slots already exist under their owners' RLS scope, but their FK
	// backfill needs to read the freshly-inserted shared `recipes` rows. Use
	// the bare `db` (privileged) so the backfill can see all owners' slots,
	// matching the existing semantics — slots are filled by slug, not by
	// user, so cross-tenant visibility here is intentional.
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
 * Compose a JSON blob for `recipes.metadata` that captures enough
 * information for the sidebar / mixup picker to keep working without
 * needing to load the recipe module. The runtime never reads this — it
 * goes straight to the registry.
 */
function buildLegacyMetadata(definition: AnyRecipeDefinition): {
	title: string;
	description?: string;
	published?: boolean;
	tags?: string[];
	category?: string;
	version?: string;
	author?: { name?: string; github?: string };
	system?: boolean;
} {
	const m = definition.meta;
	return {
		title: m.title,
		description: m.description,
		published: m.published,
		tags: m.tags,
		category: m.category,
		version: m.version,
		author: m.author,
		system: m.system,
	};
}
