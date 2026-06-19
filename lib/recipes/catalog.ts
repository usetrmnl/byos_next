import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { listReactRecipes } from "./registry";

/**
 * Catalog row exposed to the sidebar, recipes index page, and any other
 * UI surface that needs to enumerate every recipe a user can render.
 *
 * Built-in React recipes come from the in-process registry (no DB read).
 * Liquid recipes come from the `recipes` table where they are installed
 * per-user. The two sources are merged here so cold-install installs
 * still show built-ins in the sidebar even if `pnpm sync:recipes` has
 * not been run yet.
 */
export type CatalogRecipe = {
	slug: string;
	name: string;
	description: string | null;
	category: string | null;
	version: string | null;
	author: string | null;
	author_github: string | null;
	type: "react" | "liquid";
	system: boolean;
};

export async function listAllRecipes(
	options: { includeSystem?: boolean } = {},
): Promise<CatalogRecipe[]> {
	const { includeSystem = false } = options;

	const reactMetas = await listReactRecipes({
		includeSystem,
		includeUnpublished: process.env.NODE_ENV !== "production",
	});

	const reactRecipes: CatalogRecipe[] = reactMetas.map((meta) => ({
		slug: meta.slug,
		name: meta.title,
		description: meta.description ?? null,
		category: meta.category ?? null,
		version: meta.version ?? null,
		author: meta.author?.name ?? null,
		author_github: meta.author?.github ?? null,
		type: "react",
		system: meta.system ?? false,
	}));

	const liquidRecipes = await listLiquidRecipes();

	return [...reactRecipes, ...liquidRecipes].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
}

async function listLiquidRecipes(): Promise<CatalogRecipe[]> {
	const { ready } = await checkDbConnection();
	if (!ready) return [];

	const rows = await withUserScope((scopedDb) =>
		scopedDb
			.selectFrom("recipes")
			.select([
				"slug",
				"name",
				"description",
				"category",
				"version",
				"author",
				"author_github",
			])
			.where("type", "=", "liquid")
			.execute(),
	);

	return rows.map((row) => ({
		slug: row.slug,
		name: row.name,
		description: row.description,
		category: row.category,
		version: row.version,
		author: row.author,
		author_github: row.author_github,
		type: "liquid",
		system: false,
	}));
}
