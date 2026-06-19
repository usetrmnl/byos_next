import { notFound } from "next/navigation";
import { connection } from "next/server";
import { resolveReactRecipe } from "@/lib/recipes/recipe-renderer";
import { consumeBrowserRenderContext } from "@/lib/recipes/render/browser-context";
import { getRenderScale } from "@/lib/recipes/render/settings";
import { getDeviceProfile } from "@/lib/trmnl/device-profile";
import {
	getTrmnlModelClassName,
	getTrmnlModelStyle,
} from "@/lib/trmnl/model-css";

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
	const className = getTrmnlModelClassName(profile?.model);
	const style = getTrmnlModelStyle(profile?.model);

	const recipe = (
		<Component
			width={width}
			height={height}
			params={parsedParams}
			data={data}
		/>
	);
	const rendered =
		renderScale === 1 ? (
			recipe
		) : (
			<div
				style={{
					display: "flex",
					width,
					height,
					transform: `scale(${renderScale})`,
					transformOrigin: "top left",
				}}
			>
				{recipe}
			</div>
		);
	if (!className && !style) return rendered;
	return (
		<div
			className={className || undefined}
			style={{
				width: width ? width * renderScale : undefined,
				height: height ? height * renderScale : undefined,
				display: "flex",
				...style,
			}}
		>
			{rendered}
		</div>
	);
}
