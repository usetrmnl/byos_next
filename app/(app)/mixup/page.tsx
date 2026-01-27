import screens from "@/app/(app)/recipes/screens.json";
import { fetchMixups } from "@/app/actions/mixup";
import { MixupPageClient } from "@/components/mixup/mixup-page-client";

export const metadata = {
	title: "Mixup",
	description: "Compose split-screen layouts with your recipes.",
};

export default async function MixupPage() {
	const availableRecipes = Object.entries(screens)
		.filter(
			([, config]) => process.env.NODE_ENV !== "production" || config.published,
		)
		.map(([slug, config]) => ({
			slug,
			title: config.title,
			description: config.description,
			tags: config.tags,
		}))
		.sort((a, b) => a.title.localeCompare(b.title));

	const mixups = await fetchMixups();

	return <MixupPageClient initialMixups={mixups} recipes={availableRecipes} />;
}
