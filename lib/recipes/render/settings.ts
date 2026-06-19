import type { RecipeRenderSettings } from "@/lib/recipes/types";

export const SUPERSAMPLE_SCALE = 2;

export function getRenderScale(
	settings: RecipeRenderSettings | null | undefined,
): number {
	return settings?.supersample ? SUPERSAMPLE_SCALE : 1;
}
