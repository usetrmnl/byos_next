import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { resolveReactRecipe } from "@/lib/recipes/recipe-renderer";
import { consumeBrowserRenderContext } from "@/lib/recipes/render/browser-context";
import { getRenderScale } from "@/lib/recipes/render/settings";
import { getDeviceProfile } from "@/lib/trmnl/device-profile";
import {
	getTrmnlModelClassName,
	getTrmnlModelStyle,
} from "@/lib/trmnl/model-css";
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
	const className = getTrmnlModelClassName(profile?.model);
	const style = getTrmnlModelStyle(profile?.model);

	const recipe = (
		<Component
			width={screen.logicalWidth}
			height={screen.logicalHeight}
			screen={screen}
			params={parsedParams}
			data={data}
		/>
	);
	const targetWidth = screen.physicalWidth * renderScale;
	const targetHeight = screen.physicalHeight * renderScale;
	const scaleX = targetWidth / screen.logicalWidth;
	const scaleY = targetHeight / screen.logicalHeight;
	const rendered = (
		<div
			style={{
				display: "flex",
				width: targetWidth,
				height: targetHeight,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					width: screen.logicalWidth,
					height: screen.logicalHeight,
					transform: `scale(${scaleX}, ${scaleY})`,
					transformOrigin: "top left",
				}}
			>
				{recipe}
			</div>
		</div>
	);
	if (!className && !style) return rendered;
	return (
		<div
			className={className || undefined}
			style={{
				width: targetWidth,
				height: targetHeight,
				display: "flex",
				...style,
			}}
		>
			{rendered}
		</div>
	);
}
