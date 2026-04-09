import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
	fetchRecipeComponent,
	fetchRecipeConfig,
	fetchRecipeProps,
} from "@/lib/recipes/recipe-renderer";

export default async function RecipePreviewPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	// Access headers to mark route as dynamic and allow time-based operations
	headers();
	const { slug } = await params;
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

	return <Component {...props} />;
}
