import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveReactRecipe } from "@/lib/recipes/recipe-renderer";
import {
	getTrmnlModelClassName,
	getTrmnlModelStyle,
} from "@/lib/trmnl/model-css";
import { findModel } from "@/lib/trmnl/registry";

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
	}>;
}) {
	headers();
	const { slug } = await params;
	const {
		width: widthParam,
		height: heightParam,
		model: modelParam,
	} = await searchParams;

	const resolved = await resolveReactRecipe(slug);
	if (!resolved) notFound();

	const width = widthParam ? Number.parseInt(widthParam, 10) : undefined;
	const height = heightParam ? Number.parseInt(heightParam, 10) : undefined;

	const { definition, params: parsedParams, data } = resolved;
	const Component = definition.Component;

	const model = modelParam ? await findModel(modelParam) : null;
	const className = getTrmnlModelClassName(model);
	const style = getTrmnlModelStyle(model);

	const rendered = (
		<Component
			width={width}
			height={height}
			params={parsedParams}
			data={data}
		/>
	);
	if (!className && !style) return rendered;
	return (
		<div className={className || undefined} style={style}>
			{rendered}
		</div>
	);
}
