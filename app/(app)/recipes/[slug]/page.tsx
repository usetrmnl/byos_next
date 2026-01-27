import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense, use } from "react";
import screens from "@/app/(app)/recipes/screens.json";
import {
	getScreenParams,
	updateScreenParams,
} from "@/app/actions/screens-params";
import { FormatToggle } from "@/components/recipes/format-toggle";
import { RecipePreviewLayout } from "@/components/recipes/recipe-preview-layout";
import RecipeProps from "@/components/recipes/recipe-props";
import { ScreenParamsForm } from "@/components/recipes/screen-params-form";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
	addDimensionsToProps,
	ComponentProps,
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	fetchRecipeComponent,
	fetchRecipeConfig,
	fetchRecipeProps,
	getRendererType,
	isBuildPhase,
	logger,
	RecipeConfig,
	renderRecipeOutputs,
} from "@/lib/recipes/recipe-renderer";

export async function generateMetadata() {
	// This empty function enables streaming for this route
	return {};
}

// Server action for revalidating data
async function refreshData(slug: string) {
	"use server";
	await new Promise((resolve) => setTimeout(resolve, 500)); // Demo loading state
	revalidateTag(slug, "max");
}
// Generate static params for all recipes
export async function generateStaticParams() {
	return Object.keys(screens).map((slug) => ({ slug }));
}

// Combined render function for all formats (relies on Next.js cache)
const renderAllFormats = cache(
	async (
		slug: string,
		Component: React.ComponentType<ComponentProps>,
		props: ComponentProps,
		config: RecipeConfig,
		imageWidth: number,
		imageHeight: number,
	) => {
		const propsWithDimensions = addDimensionsToProps(
			props,
			imageWidth,
			imageHeight,
		);

		// During production build prerendering, avoid rendering outputs so we don't
		// trigger remote asset fetches or use Date.now() in a request-less context.
		if (isBuildPhase()) {
			logger.info(`Skipping render for ${slug} during build prerender`);
			return {
				bitmap: null as Buffer | null,
				png: null as Buffer | null,
				svg: null as string | null,
			};
		}

		try {
			logger.info(`🔄 Generating all formats for: ${slug}`);
			return await renderRecipeOutputs({
				slug,
				Component,
				props: propsWithDimensions,
				config,
				imageWidth,
				imageHeight,
			});
		} catch (error) {
			logger.error(`Error generating formats for ${slug}:`, error);
			return {
				bitmap: null as Buffer | null,
				png: null as Buffer | null,
				svg: null as string | null,
			};
		}
	},
);

// Render component with appropriate format
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
	// Fetch config and handle null case
	const configResult = use(Promise.resolve(fetchRecipeConfig(slug)));
	if (!configResult) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Configuration not found
			</div>
		);
	}

	// Fetch component and handle null case
	const componentResult = use(Promise.resolve(fetchRecipeComponent(slug)));
	if (!componentResult) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Component not found
			</div>
		);
	}

	// Now we have valid config and component
	const config = configResult;
	const Component = componentResult;

	const propsResult = use(Promise.resolve(fetchRecipeProps(slug, config)));
	const propsWithDimensions = addDimensionsToProps(
		propsResult,
		imageWidth,
		imageHeight,
	);

	// Use doubleSizeForSharperText as the single source of truth for doubling
	const useDoubling = config.renderSettings?.doubleSizeForSharperText ?? false;

	// For React component rendering
	if (format === "react") {
		return (
			<div
				style={{
					transform: useDoubling ? "scale(0.5)" : "none",
					transformOrigin: "top left",
					width: useDoubling ? "200%" : "100%",
					height: useDoubling ? "200%" : "100%",
				}}
			>
				<Component {...propsWithDimensions} />
			</div>
		);
	}

	// Get all rendered formats
	const renders = use(
		Promise.resolve(
			renderAllFormats(
				slug,
				Component,
				propsResult,
				config,
				imageWidth,
				imageHeight,
			),
		),
	);

	// For bitmap rendering
	if (format === "bitmap") {
		if (!renders.bitmap) {
			return (
				<div className="w-full h-full flex items-center justify-center">
					Failed to generate bitmap
				</div>
			);
		}

		return (
			<Image
				width={imageWidth}
				height={imageHeight}
				src={`data:image/bmp;base64,${renders.bitmap.toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} BMP render`}
				className="w-full object-cover"
			/>
		);
	}

	// For PNG rendering
	if (format === "png") {
		if (!renders.png) {
			return (
				<div className="w-full h-full flex items-center justify-center">
					Failed to generate PNG
				</div>
			);
		}

		return (
			<Image
				width={imageWidth * (useDoubling ? 2 : 1)}
				height={imageHeight * (useDoubling ? 2 : 1)}
				src={`data:image/png;base64,${renders.png.toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} PNG render`}
				className="w-full object-cover"
			/>
		);
	}

	return null;
};

// Main recipe page component
export default async function RecipePage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ format?: string }>;
}) {
	// Access headers to mark route as dynamic and allow time-based operations
	headers();
	const { slug } = await params;
	const { format } = await searchParams;
	const config = await fetchRecipeConfig(slug);
	const isPortrait = format === "portrait";
	const imageWidth = isPortrait ? DEFAULT_IMAGE_HEIGHT : DEFAULT_IMAGE_WIDTH;
	const imageHeight = isPortrait ? DEFAULT_IMAGE_WIDTH : DEFAULT_IMAGE_HEIGHT;

	if (!config) {
		notFound();
	}

	const screenParams = config.params
		? await getScreenParams(slug, config.params)
		: {};

	return (
		<div className="@container">
			<div className="flex flex-col">
				<div className="border-b pb-4 mb-4">
					<Suspense fallback={<div>Loading recipe details...</div>}>
						<h1 className="text-3xl font-semibold">{config.title}</h1>
						<p className="mt-2 max-w-prose">{config.description}</p>
						{config.renderSettings?.doubleSizeForSharperText && (
							<p className="text-sm text-gray-500 max-w-prose">
								This screen is rendering at double size for sharper text, but it
								might cause issues with the layout, for example overflow hidden
								is known to have issues with double size. change the setting in
								screens.json.
							</p>
						)}
						<div className="mt-4">
							<FormatToggle slug={slug} isPortrait={isPortrait} />
						</div>
					</Suspense>

					{config.params && Object.keys(config.params).length > 0 && (
						<ScreenParamsForm
							slug={slug}
							paramsSchema={config.params}
							initialValues={screenParams}
							updateAction={updateScreenParams}
						/>
					)}
				</div>

				<RecipePreviewLayout
					canvasWidth={imageWidth}
					bmpComponent={
						<div
							style={{ width: `${imageWidth}px`, height: `${imageHeight}px` }}
							className="border border-gray-200 overflow-hidden rounded-sm"
						>
							<AspectRatio ratio={imageWidth / imageHeight}>
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering bitmap...
										</div>
									}
								>
									<RenderComponent
										slug={slug}
										format="bitmap"
										title={config.title}
										imageWidth={imageWidth}
										imageHeight={imageHeight}
									/>
								</Suspense>
							</AspectRatio>
						</div>
					}
					pngComponent={
						<div
							style={{ width: `${imageWidth}px`, height: `${imageHeight}px` }}
							className="border border-gray-200 overflow-hidden rounded-sm"
						>
							<AspectRatio ratio={imageWidth / imageHeight}>
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering PNG...
										</div>
									}
								>
									<RenderComponent
										slug={slug}
										format="png"
										title={config.title}
										imageWidth={imageWidth}
										imageHeight={imageHeight}
									/>
								</Suspense>
							</AspectRatio>
						</div>
					}
					reactComponent={
						<div
							style={{ width: `${imageWidth}px`, height: `${imageHeight}px` }}
							className="border border-gray-200 overflow-hidden rounded-sm"
						>
							<AspectRatio
								ratio={imageWidth / imageHeight}
								style={{ width: `${imageWidth}px`, height: `${imageHeight}px` }}
							>
								<Suspense
									fallback={
										<div className="w-full h-full flex items-center justify-center">
											Rendering recipe...
										</div>
									}
								>
									<RenderComponent
										slug={slug}
										format="react"
										title={config.title}
										imageWidth={imageWidth}
										imageHeight={imageHeight}
									/>
								</Suspense>
							</AspectRatio>
						</div>
					}
					bmpLinkComponent={
						<p className="leading-7 text-xs">
							JSX → utils/pre-satori.tsx → {getRendererType()} PNG →
							utils/render-bmp.ts →
							<Link
								href={`/api/bitmap/${slug}.bmp`}
								className="hover:underline text-blue-600 dark:text-blue-400"
							>
								/api/bitmap/{slug}.bmp
							</Link>
						</p>
					}
					pngLinkComponent={
						<p className="leading-7 text-xs">
							JSX → utils/pre-satori.tsx →{" "}
							<span className="text-blue-600 dark:text-blue-400">
								{getRendererType()} PNG
							</span>{" "}
							→ utils/render-bmp.ts →
							<Link
								href={`/api/bitmap/${slug}.bmp`}
								className="hover:underline"
							>
								/api/bitmap/{slug}.bmp
							</Link>
						</p>
					}
					reactLinkComponent={
						<p className="leading-7 text-xs">
							/recipes/screens/{slug}/{slug}.tsx
						</p>
					}
				/>

				{config.hasDataFetch && (
					<Suspense
						fallback={
							<div className="w-full h-full flex items-center justify-center">
								Loading props...
							</div>
						}
					>
						<PropsDisplay slug={slug} config={config} />
					</Suspense>
				)}
			</div>
		</div>
	);
}

// Component to display props with refresh action
const PropsDisplay = ({
	slug,
	config,
}: {
	slug: string;
	config: RecipeConfig;
}) => {
	const propsResult = use(Promise.resolve(fetchRecipeProps(slug, config)));
	return (
		<RecipeProps props={propsResult} slug={slug} refreshAction={refreshData} />
	);
};
