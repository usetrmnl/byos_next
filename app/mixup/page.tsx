import screens from "@/app/recipes/screens.json";
import { MixupBuilder } from "@/components/mixup/mixup-builder";

export const metadata = {
	title: "Mixup",
	description: "Compose split-screen layouts with your recipes.",
};

export default function MixupPage() {
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

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Mixup</h1>
				<p className="text-muted-foreground max-w-2xl">
					Blend up to four recipes on the same screen. Choose a layout, drop
					recipes into each quarter, and preview how they will share space.
				</p>
			</div>

			<MixupBuilder recipes={availableRecipes} />
		</div>
	);
}
