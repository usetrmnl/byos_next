import { createElement } from "react";
import {
	type RenderDeviceImageResult,
	renderDeviceImage,
} from "@/lib/render/device-image";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import { createScreenProfile } from "@/lib/trmnl/screen-profile";
import type { TrmnlModel, TrmnlPalette } from "@/lib/trmnl/types";
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
	palette?: TrmnlPalette | null;
	paletteId?: string | null;
};

/**
 * Resolve a recipe (React or liquid) and rasterize it.
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
	palette,
	paletteId,
}: RenderRecipeArgs): Promise<RasterizeResults> {
	// React path
	const resolved = await resolveReactRecipe(slug, userId ?? undefined);
	if (resolved) {
		const { definition, params, data } = resolved;
		const screen = createScreenProfile({
			width: imageWidth,
			height: imageHeight,
			model,
			palette,
		});
		const element = createElement(definition.Component, {
			width: screen.logicalWidth,
			height: screen.logicalHeight,
			screen,
			params,
			data,
		});
		return rasterize({
			slug,
			element,
			imageWidth,
			imageHeight,
			layoutWidth: screen.logicalWidth,
			layoutHeight: screen.logicalHeight,
			formats,
			grayscale,
			cookies,
			model,
			paletteId,
			userId,
			renderSettings: definition.meta.renderSettings ?? null,
		});
	}

	// Liquid path
	if (await isLiquidRecipe(slug, userId ?? undefined)) {
		const html = await buildLiquidHtml(slug, userId ?? undefined);
		if (html === null) {
			throw new Error(`Liquid recipe ${slug} did not produce HTML`);
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
	throw new Error(`Unknown recipe: ${slug}`);
}

export async function renderRecipeForDevice({
	slug,
	profile,
	width,
	height,
	userId,
	cookies,
}: {
	slug: string;
	profile: DeviceProfile;
	width?: number;
	height?: number;
	userId?: string | null;
	cookies?: string;
}): Promise<RenderDeviceImageResult | null> {
	const renderProfile =
		width !== undefined || height !== undefined
			? {
					...profile,
					model: {
						...profile.model,
						width: width ?? profile.model.width,
						height: height ?? profile.model.height,
					},
				}
			: profile;
	const renders = await renderRecipeToImage({
		slug,
		imageWidth: renderProfile.model.width,
		imageHeight: renderProfile.model.height,
		formats: ["png"],
		userId,
		cookies,
		model: profile.model,
		palette: profile.palette,
		paletteId: renderProfile.palette?.id ?? null,
	});

	if (!renders.png) return null;
	return renderDeviceImage({ png: renders.png, profile: renderProfile });
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
