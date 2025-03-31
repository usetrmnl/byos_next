import Link from "next/link";
import { Suspense } from "react";
import screens from "@/app/recipes/screens.json";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";

// Get published components
const getPublishedComponents = () => {
	const componentEntries = Object.entries(screens);

	// Filter out unpublished components in production
	return process.env.NODE_ENV === "production"
		? componentEntries.filter(([, config]) => config.published)
		: componentEntries;
};

// Component to display a preview with Suspense
const ComponentPreview = ({
	slug,
	config,
}: { slug: string; config: (typeof screens)[keyof typeof screens] }) => {
	return (
		<AspectRatio
			ratio={5 / 3}
			className="bg-neutral-100 flex items-center justify-center p-0 border-b"
		>
			<picture>
				<source srcSet={`/api/bitmap/${slug}.bmp`} type="image/bmp" />
				<img
					src={`/api/bitmap/${slug}.bmp`}
					alt={`${config.title} preview`}
					width={800}
					height={480}
					className="object-cover"
					style={{
						imageRendering: "pixelated",
					}}
				/>
			</picture>
		</AspectRatio>
	);
};

// Component for a single card
const RecipeCard = ({
	slug,
	config,
}: { slug: string; config: (typeof screens)[keyof typeof screens] }) => {
	return (
		<Link
			key={slug}
			href={`/recipes/${slug}`}
			className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
		>
			<ComponentPreview slug={slug} config={config} />

			<div className="p-4 flex flex-col flex-grow">
				<h4 className="scroll-m-20 text-xl font-semibold tracking-tight group-hover:text-blue-600 transition-colors">
					{config.title}
				</h4>
				<p className="text-gray-600 text-sm mt-2 mb-4 flex-grow">
					{config.description}
				</p>

				<div className="flex flex-wrap gap-2 mt-auto">
					{config.tags.slice(0, 3).map((tag: string) => (
						<Badge key={tag} variant="outline">
							{tag}
						</Badge>
					))}
					{config.tags.length > 3 && (
						<Badge variant="outline">+{config.tags.length - 3} more</Badge>
					)}
				</div>
				<div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
					<span>v{config.version}</span>
					<span>{new Date(config.updatedAt).toLocaleDateString()}</span>
				</div>
			</div>
		</Link>
	);
};

// Component for a category section
const CategorySection = ({
	category,
	components,
}: {
	category: string;
	components: Array<[string, (typeof screens)[keyof typeof screens]]>;
}) => {
	return (
		<div key={category} className="mb-8">
			<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
				{category.replace(/-/g, " ")}
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{components.map(([slug, config]) => (
					<RecipeCard key={slug} slug={slug} config={config} />
				))}
			</div>
		</div>
	);
};

// Main component that organizes recipes by category
const RecipesGrid = () => {
	const publishedComponents = getPublishedComponents();

	// Group components by category
	const componentsByCategory = publishedComponents.reduce(
		(acc, [slug, config]) => {
			const category = config.category || "uncategorized";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push([slug, config]);
			return acc;
		},
		{} as Record<
			string,
			Array<[string, (typeof screens)[keyof typeof screens]]>
		>,
	);

	// Sort categories alphabetically
	const sortedCategories = Object.keys(componentsByCategory).sort();

	return (
		<div className="flex flex-col">
			{sortedCategories.map((category) => (
				<CategorySection
					key={category}
					category={category}
					components={componentsByCategory[category]}
				/>
			))}
		</div>
	);
};

export default function RecipesIndex() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">Recipes</h1>
				<p className="text-muted-foreground">
					Browse and customize ready-to-use recipes for your TRMNL device.
				</p>
			</div>
			<Suspense fallback={<div>Loading recipes...</div>}>
				<RecipesGrid />
			</Suspense>
		</div>
	);
}
