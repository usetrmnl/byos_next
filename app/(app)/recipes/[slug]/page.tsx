import { revalidateTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense, use } from "react";
import {
	getScreenParams,
	updateScreenParams,
} from "@/app/actions/screens-params";
import { PageTemplate } from "@/components/common/page-template";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { RecipePreviewStage } from "@/components/recipes/recipe-preview-stage";
import RecipeProps from "@/components/recipes/recipe-props";
import { ScreenParamsForm } from "@/components/recipes/screen-params-form";
import { Badge } from "@/components/ui/badge";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { listAllRecipes } from "@/lib/recipes/catalog";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import LiquidPreview from "@/lib/recipes/liquid-preview";
import {
	customFieldsToParamDefinitions,
	fetchLiquidRecipeSettings,
	renderLiquidRecipe,
} from "@/lib/recipes/liquid-renderer";
import { getRendererType } from "@/lib/recipes/render/rasterize";
import { resolveReactRecipe } from "@/lib/recipes/runtime/react";
import { zodObjectToParamDefinitions } from "@/lib/recipes/zod-form";
import { listModels, listPalettes } from "@/lib/trmnl/registry";

export async function generateMetadata() {
	return {};
}

async function refreshData(slug: string) {
	"use server";
	await new Promise((resolve) => setTimeout(resolve, 500));
	revalidateTag(slug, "max");
}

export async function generateStaticParams() {
	try {
		const recipes = await listAllRecipes();
		if (recipes.length > 0) {
			return recipes.map((recipe) => ({ slug: recipe.slug }));
		}
	} catch {
		// fall through
	}
	return [{ slug: "_" }];
}

const fetchLiquidRecipeMeta = cache(async (slug: string) => {
	const { ready } = await checkDbConnection();
	if (!ready) return null;

	const recipe = await withUserScope(async (scopedDb) => {
		return scopedDb
			.selectFrom("recipes")
			.select(["name", "description", "category", "version", "updated_at"])
			.where("slug", "=", slug)
			.where("type", "=", "liquid")
			.executeTakeFirst();
	});

	return recipe ?? null;
});

const LiquidRenderComponent = ({
	slug,
	imageWidth,
	imageHeight,
	customFieldOverrides,
}: {
	slug: string;
	imageWidth: number;
	imageHeight: number;
	customFieldOverrides?: Record<string, unknown>;
}) => {
	const result = use(renderLiquidRecipe(slug, customFieldOverrides));

	if (!result) {
		return <EmptyState>Failed to render liquid template</EmptyState>;
	}

	return (
		<ScaledToFit imageWidth={imageWidth} imageHeight={imageHeight}>
			<LiquidPreview
				html={result.html}
				width={imageWidth}
				height={imageHeight}
			/>
		</ScaledToFit>
	);
};

const RenderComponent = ({
	slug,
	imageWidth,
	imageHeight,
}: {
	slug: string;
	imageWidth: number;
	imageHeight: number;
}) => {
	const resolved = use(resolveReactRecipe(slug));
	if (!resolved) return <EmptyState>Recipe not found</EmptyState>;

	const { definition, params, data } = resolved;
	const Component = definition.Component;

	return (
		<ScaledToFit imageWidth={imageWidth} imageHeight={imageHeight}>
			<Component
				width={imageWidth}
				height={imageHeight}
				params={params}
				data={data}
			/>
		</ScaledToFit>
	);
};

function ScaledToFit({
	imageWidth,
	imageHeight,
	children,
}: {
	imageWidth: number;
	imageHeight: number;
	children: React.ReactNode;
}) {
	return (
		<div
			className="absolute inset-0"
			style={{ containerType: "inline-size" } as React.CSSProperties}
		>
			<div
				style={{
					width: `${imageWidth}px`,
					height: `${imageHeight}px`,
					transform: `scale(calc(100cqi / ${imageWidth}px))`,
					transformOrigin: "top left",
				}}
			>
				{children}
			</div>
		</div>
	);
}

function EmptyState({ children }: { children: React.ReactNode }) {
	return (
		<div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
			{children}
		</div>
	);
}

function LoadingState({ label }: { label: string }) {
	return (
		<div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-neutral-500">
			<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
			{label}
		</div>
	);
}

function MetaChips({
	type,
	version,
	category,
	updatedAt,
}: {
	type?: string | null;
	version?: string | number | null;
	category?: string | null;
	updatedAt?: string | null;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5 text-xs">
			{type && (
				<Badge
					variant="outline"
					className="uppercase tracking-wider text-[10px]"
				>
					{type}
				</Badge>
			)}
			{version != null && version !== "" && (
				<Badge variant="secondary" className="tabular-nums">
					v{version}
				</Badge>
			)}
			{category && (
				<span className="rounded-md border bg-muted/40 px-2 py-0.5 capitalize text-muted-foreground">
					{String(category).replace(/-/g, " ")}
				</span>
			)}
			{updatedAt && (
				<span className="text-muted-foreground tabular-nums">
					Updated {new Date(updatedAt).toLocaleDateString()}
				</span>
			)}
		</div>
	);
}

function SectionCard({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-3">
			<div className="flex items-center gap-3">
				<h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</h3>
				<div className="h-px flex-1 bg-border" />
			</div>
			{children}
		</section>
	);
}

export default async function RecipePage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ format?: string }>;
}) {
	await connection();
	const { slug } = await params;
	const { format } = await searchParams;
	const isPortrait = format === "portrait";
	const imageWidth = isPortrait ? DEFAULT_IMAGE_HEIGHT : DEFAULT_IMAGE_WIDTH;
	const imageHeight = isPortrait ? DEFAULT_IMAGE_WIDTH : DEFAULT_IMAGE_HEIGHT;

	// React recipe path
	const resolved = await resolveReactRecipe(slug);
	if (resolved) {
		const { definition, params: resolvedParams, data } = resolved;
		const meta = definition.meta;
		const paramDefinitions = zodObjectToParamDefinitions(
			definition.paramsSchema,
		);
		const hasParams = Object.keys(paramDefinitions).length > 0;
		const [trmnlModels, trmnlPalettes] = await Promise.all([
			listModels(),
			listPalettes(),
		]);

		return (
			<div className="@container">
				<PageTemplate
					title={
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
							<h1 className="text-2xl font-bold tracking-tight">
								{meta.title}
							</h1>
							<MetaChips
								type="react"
								version={meta.version}
								category={meta.category}
								updatedAt={meta.updatedAt}
							/>
						</div>
					}
					subtitle={
						<>
							{meta.description && (
								<p className="text-sm text-muted-foreground max-w-prose">
									{meta.description}
								</p>
							)}
							{meta.renderSettings?.supersample && (
								<p className="mt-1 text-xs text-muted-foreground max-w-prose">
									Supersampling enabled: image renders at 2× resolution, then
									downsamples to the selected device size.
								</p>
							)}
						</>
					}
					left={meta.system ? null : <DeleteRecipeButton slug={slug} />}
				>
					<RecipePreviewStage
						slug={slug}
						isPortrait={isPortrait}
						trmnlModels={trmnlModels}
						trmnlPalettes={trmnlPalettes}
						deviceNode={<EmptyState>Device preview unavailable</EmptyState>}
						reactNode={
							<Suspense fallback={<LoadingState label="Rendering recipe…" />}>
								<RenderComponent
									slug={slug}
									imageWidth={imageWidth}
									imageHeight={imageHeight}
								/>
							</Suspense>
						}
						devicePipeline={
							<span>
								JSX → {getRendererType()} PNG → renderDeviceImage →{" "}
								<Link href={`/api/bitmap/${slug}.png`}>
									/api/bitmap/{slug}.png
								</Link>
							</span>
						}
						reactPipeline={
							<span>
								/recipes/screens/{slug}/{slug}.tsx
							</span>
						}
					/>

					{hasParams && (
						<ScreenParamsForm
							slug={slug}
							paramsSchema={paramDefinitions}
							initialValues={resolvedParams}
							updateAction={updateScreenParams}
						/>
					)}

					{definition.getData && (
						<SectionCard label="Data">
							<RecipeProps
								props={data}
								slug={slug}
								refreshAction={refreshData}
							/>
						</SectionCard>
					)}
				</PageTemplate>
			</div>
		);
	}

	// Liquid recipe path
	const liquidMeta = await fetchLiquidRecipeMeta(slug);
	if (!liquidMeta) notFound();

	const title = liquidMeta.name;
	const description = liquidMeta.description;

	const liquidSettings = await fetchLiquidRecipeSettings(slug);
	const customFields = liquidSettings?.custom_fields ?? [];
	const paramDefinitions = customFieldsToParamDefinitions(customFields);
	const hasParams = Object.keys(paramDefinitions).length > 0;
	const storedValues = hasParams
		? await getScreenParams(slug, paramDefinitions)
		: {};
	const [trmnlModels, trmnlPalettes] = await Promise.all([
		listModels(),
		listPalettes(),
	]);

	return (
		<div className="@container">
			<PageTemplate
				title={
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
						<MetaChips
							type="liquid"
							version={liquidMeta.version}
							category={liquidMeta.category}
							updatedAt={
								liquidMeta.updated_at instanceof Date
									? liquidMeta.updated_at.toISOString()
									: liquidMeta.updated_at
							}
						/>
					</div>
				}
				subtitle={
					description ? (
						<p className="text-sm text-muted-foreground max-w-prose">
							{description}
						</p>
					) : null
				}
				left={<DeleteRecipeButton slug={slug} />}
			>
				<RecipePreviewStage
					slug={slug}
					isPortrait={isPortrait}
					trmnlModels={trmnlModels}
					trmnlPalettes={trmnlPalettes}
					simulateReactPreviewInIframe={false}
					deviceNode={<EmptyState>Device preview unavailable</EmptyState>}
					reactNode={
						<Suspense fallback={<LoadingState label="Rendering recipe…" />}>
							<LiquidRenderComponent
								slug={slug}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
								customFieldOverrides={storedValues}
							/>
						</Suspense>
					}
					devicePipeline={
						<span>
							Liquid → liquidjs → HTML → renderer PNG → renderDeviceImage →{" "}
							<Link href={`/api/bitmap/${slug}.png`}>
								/api/bitmap/{slug}.png
							</Link>
						</span>
					}
					reactPipeline={
						<span>Liquid → liquidjs → HTML → browser preview</span>
					}
				/>

				{hasParams && (
					<ScreenParamsForm
						slug={slug}
						paramsSchema={paramDefinitions}
						initialValues={storedValues}
						updateAction={updateScreenParams}
					/>
				)}
			</PageTemplate>
		</div>
	);
}
