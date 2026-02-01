import Link from "next/link";
import { Suspense } from "react";
import { fetchRecipes } from "@/app/actions/mixup";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PageTemplate } from "@/components/ui/page-template";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
			className="bg-red-100 flex items-center justify-center p-0 border-b"
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
			className="group flex flex-col h-full"
		>
			<Card className="pt-0 overflow-hidden h-full flex flex-col transition-shadow group-hover:shadow-md">
				<ComponentPreview recipe={recipe} />

				<CardHeader>
					<div className="flex items-center gap-2">
						<Badge variant="outline">
							{recipe.type.charAt(0).toUpperCase() + recipe.type.slice(1)}
						</Badge>
						{recipe.version && (
							<Badge variant="secondary">v{recipe.version}</Badge>
						)}
					</div>
					<CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
						{recipe.name}
					</CardTitle>
					{recipe.description && (
						<CardDescription>{recipe.description}</CardDescription>
					)}
				</CardHeader>

				<CardContent className="flex-grow" />

				<Separator />

				<CardFooter className="text-xs text-muted-foreground flex justify-between items-center">
					{recipe.category && (
						<span className="capitalize">
							{recipe.category.replace(/-/g, " ")}
						</span>
					)}
					{recipe.updated_at && (
						<span>{new Date(recipe.updated_at).toLocaleDateString()}</span>
					)}
				</CardFooter>
			</Card>
		</Link>
	);
};

// Skeleton card for loading state
const RecipeCardSkeleton = () => {
	return (
		<Card className="overflow-hidden h-full flex flex-col">
			<AspectRatio
				ratio={DEFAULT_IMAGE_WIDTH / DEFAULT_IMAGE_HEIGHT}
				className="border-b"
			>
				<Skeleton className="h-full w-full" />
			</AspectRatio>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-14 rounded-full" />
					<Skeleton className="h-5 w-10 rounded-full" />
				</div>
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
			</CardHeader>
			<CardContent className="flex-grow" />
			<Separator />
			<CardFooter className="py-3">
				<div className="flex justify-between items-center w-full">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-20" />
				</div>
			</CardFooter>
		</Card>
	);
};

const RecipesGridSkeleton = () => {
	return (
		<div className="flex flex-col">
			<div className="mb-8">
				<Skeleton className="h-8 w-40 mb-4" />
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<RecipeCardSkeleton key={i} />
					))}
				</div>
			</div>
		</div>
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
			<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4 capitalize">
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
			const category = (recipe.category || "uncategorized").split(",")[0];
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
			<Suspense fallback={<RecipesGridSkeleton />}>
				<RecipesGrid />
			</Suspense>
		</PageTemplate>
	);
}
