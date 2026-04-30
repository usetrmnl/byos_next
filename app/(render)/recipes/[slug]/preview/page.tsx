import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
	fetchRecipeComponent,
	fetchRecipeConfig,
	fetchRecipeProps,
} from "@/lib/recipes/recipe-renderer";
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
	// Access headers to mark route as dynamic and allow time-based operations
	headers();
	const { slug } = await params;
	const {
		width: widthParam,
		height: heightParam,
		model: modelParam,
	} = await searchParams;

	const config = await fetchRecipeConfig(slug);

	if (!config) {
		notFound();
	}

	const component = await fetchRecipeComponent(slug);

	if (!component) {
		notFound();
	}

	const Component = component;
	const props = await fetchRecipeProps(slug, config);

	// Apply width/height from query params if provided (for browser rendering)
	const width = widthParam ? Number.parseInt(widthParam, 10) : undefined;
	const height = heightParam ? Number.parseInt(heightParam, 10) : undefined;

	const propsWithDimensions = {
		...props,
		...(width !== undefined && !Number.isNaN(width) && { width }),
		...(height !== undefined && !Number.isNaN(height) && { height }),
	};

	// Apply TRMNL model.css.{classes,variables} so recipes that consume the
	// framework selectors / CSS vars render faithfully under the simulated panel.
	const model = modelParam ? await findModel(modelParam) : null;
	const className = getTrmnlModelClassName(model);
	const style = getTrmnlModelStyle(model);

	const rendered = <Component {...propsWithDimensions} />;
	if (!className && !style) return rendered;
	return (
		<div className={className || undefined} style={style}>
			{rendered}
		</div>
	);
}
