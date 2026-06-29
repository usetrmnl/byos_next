import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { consumeBrowserRenderContext } from "@/lib/recipes/render/browser-context";
import {
	wrapLogicalCanvasToTarget,
	wrapWithTrmnlCss,
} from "@/lib/recipes/render/frame";
import { rewriteReactImagesForDevice } from "@/lib/recipes/render/image-dither-intercept";
import { resolveImageDitherPolicy } from "@/lib/recipes/render/image-dither-policy";
import { getRenderScale } from "@/lib/recipes/render/settings";
import { resolveReactRecipe } from "@/lib/recipes/runtime/react";
import { getDeviceProfile } from "@/lib/trmnl/device-profile";
import { createScreenProfile } from "@/lib/trmnl/screen-profile";

export default async function RecipePreviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{
		width?: string;
		height?: string;
		model?: string;
		palette_id?: string;
		render_token?: string;
	}>;
}) {
	await connection();
	const { slug } = await params;
	const {
		width: widthParam,
		height: heightParam,
		model: modelParam,
		palette_id: paletteParam,
		render_token: renderToken,
	} = await searchParams;
	const userId = consumeBrowserRenderContext(renderToken);

	const resolved = await resolveReactRecipe(slug, userId ?? undefined);
	if (!resolved) notFound();

	const width = widthParam ? Number.parseInt(widthParam, 10) : undefined;
	const height = heightParam ? Number.parseInt(heightParam, 10) : undefined;

	const { definition, params: parsedParams, data } = resolved;
	const Component = definition.Component;
	const renderScale = getRenderScale(definition.meta.renderSettings ?? null);

	const profile =
		modelParam || paletteParam
			? await getDeviceProfile(modelParam, paletteParam)
			: null;
	const screen = createScreenProfile({
		width: width ?? profile?.model.width ?? DEFAULT_IMAGE_WIDTH,
		height: height ?? profile?.model.height ?? DEFAULT_IMAGE_HEIGHT,
		model: profile?.model,
		palette: profile?.palette,
	});

	const recipe = (
		<Component
			width={screen.logicalWidth}
			height={screen.logicalHeight}
			screen={screen}
			params={parsedParams}
			data={data}
		/>
	);
	const imageDitherPolicy = resolveImageDitherPolicy({
		renderSettings: definition.meta.renderSettings ?? null,
		profile,
	});
	const renderedRecipe = await rewriteReactImagesForDevice(
		recipe,
		imageDitherPolicy,
	);
	const targetWidth = screen.physicalWidth * renderScale;
	const targetHeight = screen.physicalHeight * renderScale;
	const rendered = wrapLogicalCanvasToTarget(
		renderedRecipe,
		screen.logicalWidth,
		screen.logicalHeight,
		targetWidth,
		targetHeight,
	);
	return wrapWithTrmnlCss(
		rendered,
		profile?.model ?? null,
		targetWidth,
		targetHeight,
	);
}
