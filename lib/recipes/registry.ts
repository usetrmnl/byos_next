import { cache } from "react";
import { reactRecipeLoaders } from "./screens.generated";
import type { AnyRecipeDefinition, RecipeMeta } from "./types";

/**
 * Built-in React recipe registry. Single source of truth for recipe
 * definitions — derived from each recipe's `definition` export, not from
 * the database. Memoized per request via React's `cache()`.
 */

class RecipeDefinitionMissingError extends Error {
	constructor(slug: string) {
		super(
			`Recipe "${slug}" is missing a 'definition' export. Add 'export const definition: RecipeDefinition<...>' to app/(app)/recipes/screens/${slug}/${slug}.tsx and run \`pnpm generate:recipes\`.`,
		);
		this.name = "RecipeDefinitionMissingError";
	}
}

export const getReactRecipeDefinition = cache(
	async (slug: string): Promise<AnyRecipeDefinition | null> => {
		const loader = reactRecipeLoaders[slug];
		if (!loader) return null;

		const mod = await loader();
		if (!mod.definition) {
			throw new RecipeDefinitionMissingError(slug);
		}
		return mod.definition;
	},
);

export const listReactRecipes = cache(
	async (
		options: { includeSystem?: boolean; includeUnpublished?: boolean } = {},
	): Promise<RecipeMeta[]> => {
		const { includeSystem = false, includeUnpublished = false } = options;
		const slugs = Object.keys(reactRecipeLoaders);
		const definitions = await Promise.all(slugs.map(getReactRecipeDefinition));

		const metas: RecipeMeta[] = [];
		for (const def of definitions) {
			if (!def) continue;
			if (def.meta.system && !includeSystem) continue;
			if (def.meta.published === false && !includeUnpublished) continue;
			metas.push(def.meta);
		}
		return metas;
	},
);

export function isReactRecipe(slug: string): boolean {
	return Object.hasOwn(reactRecipeLoaders, slug);
}
