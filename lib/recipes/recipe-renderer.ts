import { createElement } from "react";
import NotFoundScreen from "@/app/(app)/recipes/screens/not-found/not-found";
import {
	type RenderDeviceImageResult,
	renderDeviceImage,
} from "@/lib/render/device-image";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import type { TrmnlModel } from "@/lib/trmnl/types";
import {
	customFieldsToParamDefinitions,
	fetchLiquidRecipeSettings,
	isLiquidRecipe,
	renderLiquidRecipe,
} from "./liquid-renderer";
import {
	type RasterizeFormat,
	type RasterizeResults,
	rasterize,
} from "./render/rasterize";
import { resolveReactRecipe } from "./runtime/react";

/**
 * Thin orchestrator. The heavy lifting now lives in:
 *   - `lib/recipes/registry.ts`        (built-in React recipe lookup)
 *   - `lib/recipes/runtime/react.ts`   (params + data resolution)
 *   - `lib/recipes/render/rasterize.ts` (PNG / bitmap pipeline)
 *   - `lib/recipes/liquid-renderer.ts` (TRMNL-plugin liquid path)
 *
 * Two top-level entry points: `renderRecipeToImage` and
 * `renderRecipeForDevice`. Both branch React vs liquid internally so API
 * routes don't need to know the difference.
 */

export { DEFAULT_IMAGE_HEIGHT, DEFAULT_IMAGE_WIDTH } from "./constants";
export { logger } from "./logger";
export { getReactRecipeDefinition, listReactRecipes } from "./registry";
export { getRendererType } from "./render/rasterize";
export { resolveReactRecipe } from "./runtime/react";
export type { RecipeMeta } from "./types";
export type {
	RecipeParamDefinition,
	RecipeParamDefinitions,
	RecipeParamType,
} from "./zod-form";

export const isBuildPhase = (): boolean =>
	process.env.NEXT_PHASE === "phase-production-build";

type RenderRecipeArgs = {
	slug: string;
	imageWidth: number;
	imageHeight: number;
	formats?: RasterizeFormat[];
	grayscale?: number;
	userId?: string | null;
	cookies?: string;
	model?: TrmnlModel | null;
	paletteId?: string | null;
};

/**
 * Resolve a recipe (React or liquid) and rasterize it. Returns
 * `{ bitmap: null, png: null }` when nothing renders.
 */
export async function renderRecipeToImage({
	slug,
	imageWidth,
	imageHeight,
	formats = ["bitmap", "png"],
	grayscale,
	userId,
	cookies,
	model,
	paletteId,
}: RenderRecipeArgs): Promise<RasterizeResults> {
	// React path
	const resolved = await resolveReactRecipe(slug, userId ?? undefined);
	if (resolved) {
		const { definition, params, data } = resolved;
		const element = createElement(definition.Component, {
			width: imageWidth,
			height: imageHeight,
			params,
			data,
		});
		return rasterize({
			slug,
			element,
			imageWidth,
			imageHeight,
			formats,
			grayscale,
			cookies,
			model,
			paletteId,
			renderSettings: definition.meta.renderSettings ?? null,
		});
	}

	// Liquid path
	if (await isLiquidRecipe(slug, userId ?? undefined)) {
		const html = await buildLiquidHtml(slug, userId ?? undefined);
		if (html === null) {
			return rasterizeNotFound({ slug, imageWidth, imageHeight, formats });
		}
		return rasterize({
			slug,
			html,
			imageWidth,
			imageHeight,
			formats,
			grayscale,
			cookies,
			model,
			paletteId,
			renderSettings: null,
		});
	}

	// Unknown slug
	return rasterizeNotFound({ slug, imageWidth, imageHeight, formats });
}

export async function renderRecipeForDevice({
	slug,
	profile,
	userId,
	cookies,
}: {
	slug: string;
	profile: DeviceProfile;
	userId?: string | null;
	cookies?: string;
}): Promise<RenderDeviceImageResult | null> {
	const renders = await renderRecipeToImage({
		slug,
		imageWidth: profile.model.width,
		imageHeight: profile.model.height,
		formats: ["png"],
		userId,
		cookies,
		model: profile.model,
		paletteId: profile.palette?.id ?? null,
	});

	if (!renders.png) return null;
	return renderDeviceImage({ png: renders.png, profile });
}

async function buildLiquidHtml(
	slug: string,
	userId?: string,
): Promise<string | null> {
	let customFieldOverrides: Record<string, unknown> | undefined;
	const settings = await fetchLiquidRecipeSettings(slug, userId);
	if (settings?.custom_fields?.length) {
		const definitions = customFieldsToParamDefinitions(settings.custom_fields);
		const { getScreenParams } = await import("@/app/actions/screens-params");
		customFieldOverrides = await getScreenParams(slug, definitions, userId);
	}
	const result = await renderLiquidRecipe(slug, customFieldOverrides, userId);
	return result?.html ?? null;
}

async function rasterizeNotFound({
	slug,
	imageWidth,
	imageHeight,
	formats,
}: {
	slug: string;
	imageWidth: number;
	imageHeight: number;
	formats: RasterizeFormat[];
}): Promise<RasterizeResults> {
	const element = createElement(NotFoundScreen, {
		slug,
		width: imageWidth,
		height: imageHeight,
	});
	return rasterize({
		slug,
		element,
		imageWidth,
		imageHeight,
		formats,
		renderSettings: null,
	});
}
