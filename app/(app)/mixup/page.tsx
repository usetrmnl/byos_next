import { fetchMixups, fetchRecipes } from "@/app/actions/mixup";
import { syncReactRecipes } from "@/lib/recipes/sync-react-recipes";
import MixupClientPage from "./client-page";

export const metadata = {
	title: "Mixup",
	description: "Compose split-screen layouts with your recipes.",
};

export default async function MixupPage() {
	// Ensure react recipes are synced to DB
	await syncReactRecipes();

	const [mixups, recipes] = await Promise.all([
		fetchMixups(),
		fetchRecipes(),
	]);

	const availableRecipes = recipes.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.name,
		description: r.description ?? undefined,
	}));

	return <MixupClientPage initialMixups={mixups} recipes={availableRecipes} />;
}
