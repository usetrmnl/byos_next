import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import LiquidPreview from "@/lib/recipes/liquid-preview";
import {
	customFieldsToParamDefinitions,
	fetchLiquidRecipeSettings,
	renderLiquidRecipe,
} from "@/lib/recipes/liquid-renderer";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	getRendererType,
	isBuildPhase,
	logger,
	renderRecipeToImage,
	resolveReactRecipe,
} from "@/lib/recipes/recipe-renderer";
import { rasterize } from "@/lib/recipes/render/rasterize";
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
	format,
	title,
	imageWidth,
	imageHeight,
	customFieldOverrides,
}: {
	slug: string;
	format: "bitmap" | "png" | "react";
	title: string;
	imageWidth: number;
	imageHeight: number;
	customFieldOverrides?: Record<string, unknown>;
}) => {
	const result = use(renderLiquidRecipe(slug, customFieldOverrides));

	if (!result) {
		return <EmptyState>Failed to render liquid template</EmptyState>;
	}

	if (format === "react") {
		return (
			<ScaledToFit imageWidth={imageWidth} imageHeight={imageHeight}>
				<LiquidPreview
					html={result.html}
					width={imageWidth}
					height={imageHeight}
				/>
			</ScaledToFit>
		);
	}

	const renders = use(
		rasterize({
			slug,
			html: result.html,
			imageWidth,
			imageHeight,
			renderSettings: null,
		}),
	);

	if (format === "bitmap") {
		if (!renders.bitmap)
			return <EmptyState>Failed to generate bitmap</EmptyState>;
		return (
			<Image
				width={imageWidth}
				height={imageHeight}
				src={`data:image/bmp;base64,${renders.bitmap.toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} BMP render`}
				className="absolute inset-0 h-full w-full object-cover"
			/>
		);
	}

	if (format === "png") {
		if (!renders.png) return <EmptyState>Failed to generate PNG</EmptyState>;
		return (
			<Image
				width={imageWidth}
				height={imageHeight}
				src={`data:image/png;base64,${renders.png.toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} PNG render`}
				className="absolute inset-0 h-full w-full object-cover"
			/>
		);
	}

	return null;
};

const renderReactFormats = cache(
	async (
		slug: string,
		imageWidth: number,
		imageHeight: number,
	): Promise<{
		bitmap: Buffer | null;
		png: Buffer | null;
	}> => {
		if (isBuildPhase()) {
			logger.info(`Skipping render for ${slug} during build prerender`);
			return { bitmap: null, png: null };
		}
		try {
			logger.info(`🔄 Generating all formats for: ${slug}`);
			return await renderRecipeToImage({
				slug,
				imageWidth,
				imageHeight,
				formats: ["bitmap", "png"],
			});
		} catch (error) {
			logger.error(`Error generating formats for ${slug}:`, error);
			return { bitmap: null, png: null };
		}
	},
);

const RenderComponent = ({
	slug,
	format,
	title,
	imageWidth,
	imageHeight,
}: {
	slug: string;
	format: "bitmap" | "png" | "react";
	title: string;
	imageWidth: number;
	imageHeight: number;
}) => {
	const resolved = use(resolveReactRecipe(slug));
	if (!resolved) return <EmptyState>Recipe not found</EmptyState>;

	const { definition, params, data } = resolved;
	const Component = definition.Component;
	const useDoubling =
		definition.meta.renderSettings?.doubleSizeForSharperText ?? false;

	if (format === "react") {
		return (
			<ScaledToFit imageWidth={imageWidth} imageHeight={imageHeight}>
				{useDoubling ? (
					<div
						style={{
							transform: "scale(0.5)",
							transformOrigin: "top left",
							width: "200%",
							height: "200%",
						}}
					>
						<Component
							width={imageWidth}
							height={imageHeight}
							params={params}
							data={data}
						/>
					</div>
				) : (
					<Component
						width={imageWidth}
						height={imageHeight}
						params={params}
						data={data}
					/>
				)}
			</ScaledToFit>
		);
	}

	const renders = use(renderReactFormats(slug, imageWidth, imageHeight));

	if (format === "bitmap") {
		if (!renders.bitmap)
			return <EmptyState>Failed to generate bitmap</EmptyState>;
		return (
			<Image
				width={imageWidth}
				height={imageHeight}
				src={`data:image/bmp;base64,${renders.bitmap.toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} BMP render`}
				className="absolute inset-0 h-full w-full object-cover"
			/>
		);
	}

	if (format === "png") {
		if (!renders.png) return <EmptyState>Failed to generate PNG</EmptyState>;
		return (
			<Image
				width={imageWidth}
				height={imageHeight}
				src={`data:image/png;base64,${renders.png.toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} PNG render`}
				className="absolute inset-0 h-full w-full object-cover"
			/>
		);
	}

	return null;
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
	headers();
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
							{meta.renderSettings?.doubleSizeForSharperText && (
								<p className="mt-1 text-xs text-muted-foreground max-w-prose">
									Rendering at double size for sharper text — some layouts with
									overflow-hidden may need adjustment.
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
						bmpNode={
							<Suspense fallback={<LoadingState label="Rendering bitmap…" />}>
								<RenderComponent
									slug={slug}
									format="bitmap"
									title={meta.title}
									imageWidth={imageWidth}
									imageHeight={imageHeight}
								/>
							</Suspense>
						}
						pngNode={
							<Suspense fallback={<LoadingState label="Rendering PNG…" />}>
								<RenderComponent
									slug={slug}
									format="png"
									title={meta.title}
									imageWidth={imageWidth}
									imageHeight={imageHeight}
								/>
							</Suspense>
						}
						reactNode={
							<Suspense fallback={<LoadingState label="Rendering recipe…" />}>
								<RenderComponent
									slug={slug}
									format="react"
									title={meta.title}
									imageWidth={imageWidth}
									imageHeight={imageHeight}
								/>
							</Suspense>
						}
						bmpPipeline={
							<span>
								JSX → pre-satori → {getRendererType()} PNG → render-bmp →{" "}
								<Link href={`/api/bitmap/${slug}.bmp`}>
									/api/bitmap/{slug}.bmp
								</Link>
							</span>
						}
						pngPipeline={
							<span>
								JSX → pre-satori → {getRendererType()} PNG →{" "}
								<Link href={`/api/bitmap/${slug}.bmp`}>
									/api/bitmap/{slug}.bmp
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
					bmpNode={
						<Suspense fallback={<LoadingState label="Rendering bitmap…" />}>
							<LiquidRenderComponent
								slug={slug}
								format="bitmap"
								title={title}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
								customFieldOverrides={storedValues}
							/>
						</Suspense>
					}
					pngNode={
						<Suspense fallback={<LoadingState label="Rendering PNG…" />}>
							<LiquidRenderComponent
								slug={slug}
								format="png"
								title={title}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
								customFieldOverrides={storedValues}
							/>
						</Suspense>
					}
					reactNode={
						<Suspense fallback={<LoadingState label="Rendering recipe…" />}>
							<LiquidRenderComponent
								slug={slug}
								format="react"
								title={title}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
								customFieldOverrides={storedValues}
							/>
						</Suspense>
					}
					bmpPipeline={
						<span>
							Liquid → liquidjs → HTML → Puppeteer PNG → render-bmp →{" "}
							<Link href={`/api/bitmap/${slug}.bmp`}>
								/api/bitmap/{slug}.bmp
							</Link>
						</span>
					}
					pngPipeline={<span>Liquid → liquidjs → HTML → Puppeteer PNG</span>}
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
