import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageTemplate } from "@/components/common/page-template";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type CatalogRecipe, listAllRecipes } from "@/lib/recipes/catalog";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";

const RecipeCard = ({ recipe }: { recipe: CatalogRecipe }) => {
	return (
		<Link
			key={recipe.slug}
			href={`/recipes/${recipe.slug}`}
			className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
		>
			<div
				className="relative overflow-hidden border-b bg-neutral-100"
				style={{
					aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
				}}
			>
				<picture>
					<source srcSet={`/api/bitmap/${recipe.slug}.bmp`} type="image/bmp" />
					<img
						src={`/api/bitmap/${recipe.slug}.bmp`}
						alt={`${recipe.name} preview`}
						width={DEFAULT_IMAGE_WIDTH}
						height={DEFAULT_IMAGE_HEIGHT}
						className="absolute inset-0 h-full w-full object-cover"
						style={{ imageRendering: "pixelated" }}
					/>
				</picture>
				<div className="absolute left-2 top-2 flex items-center gap-1">
					<Badge
						variant="secondary"
						className="h-5 border border-black/10 bg-white/85 text-[10px] uppercase tracking-wider backdrop-blur"
					>
						{recipe.type}
					</Badge>
					{recipe.version && (
						<Badge
							variant="secondary"
							className="h-5 border border-black/10 bg-white/85 text-[10px] tabular-nums backdrop-blur"
						>
							v{recipe.version}
						</Badge>
					)}
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-1.5 p-4">
				<div className="flex items-start justify-between gap-2">
					<h3 className="text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
						{recipe.name}
					</h3>
					<ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
				</div>
				{recipe.description && (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{recipe.description}
					</p>
				)}
				<div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
					{recipe.category ? (
						<span className="capitalize">
							{recipe.category.replace(/-/g, " ")}
						</span>
					) : (
						<span>—</span>
					)}
					{recipe.version && (
						<span className="tabular-nums">v{recipe.version}</span>
					)}
				</div>
			</div>
		</Link>
	);
};

const RecipeCardSkeleton = () => {
	return (
		<div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
			<Skeleton
				className="w-full rounded-none"
				style={{
					aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
				}}
			/>
			<div className="flex flex-1 flex-col gap-2 p-4">
				<Skeleton className="h-5 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
				<div className="mt-auto flex justify-between pt-2">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>
		</div>
	);
};

const RecipesGridSkeleton = () => {
	return (
		<div className="space-y-10">
			{Array.from({ length: 2 }).map((_, section) => (
				<div key={section} className="space-y-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-3 w-24" />
						<div className="h-px flex-1 bg-border" />
					</div>
					<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<RecipeCardSkeleton key={i} />
						))}
					</div>
				</div>
			))}
		</div>
	);
};

const CategorySection = ({
	category,
	recipes,
}: {
	category: string;
	recipes: CatalogRecipe[];
}) => {
	return (
		<section key={category} className="space-y-4">
			<div className="flex items-center gap-3">
				<h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					{category.replace(/-/g, " ")}
				</h3>
				<span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
					{recipes.length}
				</span>
				<div className="h-px flex-1 bg-border" />
			</div>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				{recipes.map((recipe) => (
					<RecipeCard key={recipe.slug} recipe={recipe} />
				))}
			</div>
		</section>
	);
};

async function RecipesGrid() {
	const allRecipes = await listAllRecipes();

	const recipesByCategory = allRecipes.reduce(
		(acc, recipe) => {
			const category = (recipe.category || "uncategorized").split(",")[0];
			if (!acc[category]) acc[category] = [];
			acc[category].push(recipe);
			return acc;
		},
		{} as Record<string, CatalogRecipe[]>,
	);

	const sortedCategories = Object.keys(recipesByCategory).sort();

	return (
		<div className="space-y-10">
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
