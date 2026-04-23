import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
	fetchRecipeComponent,
	fetchRecipeConfig,
	fetchRecipeProps,
} from "@/lib/recipes/recipe-renderer";

export default async function RecipePreviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ width?: string; height?: string }>;
}) {
	// Access headers to mark route as dynamic and allow time-based operations
	headers();
	const { slug } = await params;
	const { width: widthParam, height: heightParam } = await searchParams;

	const config = fetchRecipeConfig(slug);

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

	return <Component {...propsWithDimensions} />;
}
