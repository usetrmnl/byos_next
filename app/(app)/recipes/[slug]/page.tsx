import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, use } from "react";
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
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
	fetchRecipeComponent,
	fetchRecipeConfig,
	fetchRecipeProps,
	RecipeConfig,
} from "@/lib/recipes/recipe-renderer";
import { ScreenshotImage } from "./screenshot-image";
import { DitheringMethod } from "@/utils/render-bmp";

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

// Render component with appropriate format
const RenderComponent = ({
	slug,
	format,
	src,
	title,
	imageWidth,
	imageHeight,
}: {
	slug: string;
	format: "bitmap" | "png" | "react";
	src?: string;
	title: string;
	imageWidth: number;
	imageHeight: number;
}) => {
	if (format === "bitmap" || format === "png") {
		return (
			<ScreenshotImage
				src={src}
				width={imageWidth}
				height={imageHeight}
				alt={`${title} ${format.toUpperCase()} render`}
			/>
		);
	}

	// format === "react": render the component directly
	const configResult = use(Promise.resolve(fetchRecipeConfig(slug)));
	if (!configResult) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Configuration not found
			</div>
		);
	}

	const componentResult = use(Promise.resolve(fetchRecipeComponent(slug)));
	if (!componentResult) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				Component not found
			</div>
		);
	}

	const config = configResult;
	const Component = componentResult;

	const propsResult = use(Promise.resolve(fetchRecipeProps(slug, config)));
	const propsWithDimensions = addDimensionsToProps(
		propsResult,
		imageWidth,
		imageHeight,
	);

	const useDoubling = config.renderSettings?.doubleSizeForSharperText ?? false;

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
};

const PreviewPanel = ({
	width,
	height,
	label,
	children,
}: {
	width: number;
	height: number;
	label: string;
	children: React.ReactNode;
}) => (
	<div
		style={{ width: `${width}px`, height: `${height}px` }}
		className="border border-gray-200 overflow-hidden rounded-sm"
	>
		<AspectRatio ratio={width / height}>
			<Suspense
				fallback={
					<div className="w-full h-full flex items-center justify-center">
						{label}
					</div>
				}
			>
				{children}
			</Suspense>
		</AspectRatio>
	</div>
);

const RecipeLink = ({ href }: { href: string }) => (
	<p className="leading-7 text-xs">
		<Link
			href={href}
			prefetch={false}
			className="hover:underline text-blue-600 dark:text-blue-400"
		>
			{href}
		</Link>
	</p>
);

// Main recipe page component
export default async function RecipePage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{
		format?: string;
		dither?: string;
		bitdepth?: string;
	}>;
}) {
	// Access headers to mark route as dynamic and allow time-based operations
	headers();
	const { slug } = await params;
	const { format, dither, bitdepth } = await searchParams;
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

	// Parse bitmap options
	const rawBitDepth = bitdepth ? parseInt(bitdepth, 10) : 2;
	const validBitDepth = ([1, 2, 4] as const).includes(rawBitDepth as 1 | 2 | 4)
		? (rawBitDepth as 1 | 2 | 4)
		: 2;
	const validDitherMethods = Object.values(DitheringMethod);
	const ditheringMethod = dither
		? validDitherMethods.includes(dither as DitheringMethod)
			? (dither as DitheringMethod)
			: DitheringMethod.FLOYD_STEINBERG
		: DitheringMethod.FLOYD_STEINBERG;

	const bmpSrc = `/api/screenshot/${slug}.bmp?width=${imageWidth}&height=${imageHeight}&bitdepth=${validBitDepth}&dither=${ditheringMethod}`;
	const pngSrc = `/api/screenshot/${slug}.png?width=${imageWidth}&height=${imageHeight}`;
	const previewSrc = `/recipes/${slug}/preview`;

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
					slug={slug}
					isPortrait={isPortrait}
					currentDither={ditheringMethod}
					currentBitDepth={validBitDepth}
					bmpComponent={
						<PreviewPanel
							width={imageWidth}
							height={imageHeight}
							label="Rendering bitmap..."
						>
							<RenderComponent
								slug={slug}
								format="bitmap"
								src={bmpSrc}
								title={config.title}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
							/>
						</PreviewPanel>
					}
					pngComponent={
						<PreviewPanel
							width={imageWidth}
							height={imageHeight}
							label="Rendering PNG..."
						>
							<RenderComponent
								slug={slug}
								format="png"
								src={pngSrc}
								title={config.title}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
							/>
						</PreviewPanel>
					}
					reactComponent={
						<PreviewPanel
							width={imageWidth}
							height={imageHeight}
							label="Rendering recipe..."
						>
							<RenderComponent
								slug={slug}
								format="react"
								title={config.title}
								imageWidth={imageWidth}
								imageHeight={imageHeight}
							/>
						</PreviewPanel>
					}
					bmpLinkComponent={<RecipeLink href={bmpSrc} />}
					pngLinkComponent={<RecipeLink href={pngSrc} />}
					reactLinkComponent={<RecipeLink href={previewSrc} />}
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
