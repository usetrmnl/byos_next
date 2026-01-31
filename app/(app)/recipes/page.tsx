import Link from "next/link";
import { Suspense } from "react";
import { fetchRecipes } from "@/app/actions/mixup";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PageTemplate } from "@/components/ui/page-template";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Recipe } from "@/lib/types";

// Component to display a preview with Suspense
const ComponentPreview = ({ recipe }: { recipe: Recipe }) => {
	return (
		<AspectRatio
			ratio={DEFAULT_IMAGE_WIDTH / DEFAULT_IMAGE_HEIGHT}
			className="bg-neutral-100 flex items-center justify-center p-0 border-b"
		>
			<picture>
				<source srcSet={`/api/bitmap/${recipe.slug}.bmp`} type="image/bmp" />
				<img
					src={`/api/bitmap/${recipe.slug}.bmp`}
					alt={`${recipe.name} preview`}
					width={DEFAULT_IMAGE_WIDTH}
					height={DEFAULT_IMAGE_HEIGHT}
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
const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
	return (
		<Link
			key={recipe.slug}
			href={`/recipes/${recipe.slug}`}
			className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
		>
			<ComponentPreview recipe={recipe} />

			<div className="p-4 flex flex-col flex-grow">
				<h4 className="scroll-m-20 text-xl font-semibold tracking-tight group-hover:text-blue-600 transition-colors">
					{recipe.name}
				</h4>
				<p className="text-gray-600 text-sm mt-2 mb-4 flex-grow">
					{recipe.description}
				</p>

				<div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
					{recipe.version && <span>v{recipe.version}</span>}
					{recipe.updated_at && (
						<span>{new Date(recipe.updated_at).toLocaleDateString()}</span>
					)}
				</div>
			</div>
		</Link>
	);
};

// Component for a category section
const CategorySection = ({
	category,
	recipes,
}: {
	category: string;
	recipes: Recipe[];
}) => {
	return (
		<div key={category} className="mb-8">
			<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
				{category.replace(/-/g, " ")}
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{recipes.map((recipe) => (
					<RecipeCard key={recipe.slug} recipe={recipe} />
				))}
			</div>
		</div>
	);
};

// Main component that organizes recipes by category
async function RecipesGrid() {
	const allRecipes = await fetchRecipes();

	// Group recipes by category
	const recipesByCategory = allRecipes.reduce(
		(acc, recipe) => {
			const category = recipe.category || "uncategorized";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(recipe);
			return acc;
		},
		{} as Record<string, Recipe[]>,
	);

	// Sort categories alphabetically
	const sortedCategories = Object.keys(recipesByCategory).sort();

	return (
		<div className="flex flex-col">
			{sortedCategories.map((category) => (
				<CategorySection
					key={category}
					category={category}
					recipes={recipesByCategory[category]}
				/>
			))}
		</div>
	);
}

export default function RecipesIndex() {
	return (
		<PageTemplate
			title="Recipes"
			subtitle="Browse and customize ready-to-use recipes for your TRMNL device."
		>
			<Suspense fallback={<div>Loading recipes...</div>}>
				<RecipesGrid />
			</Suspense>
		</PageTemplate>
	);
}
