import fs from "fs";
import path from "path";
import { createElement, Suspense, use, cache } from "react";
import { ImageResponse } from "next/og";
import { renderBmp } from "@/utils/render-bmp";
import screens from "@/app/recipes/screens.json";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { RecipePreviewLayout } from "@/components/recipes/recipe-preview-layout";
import RecipeProps from "@/components/recipes/recipe-props";
import { revalidateTag } from "next/cache";
import Link from "next/link";
import satori from "satori";

export async function generateMetadata() {
	// This empty function enables streaming for this route
	return {}
}

// Server action for revalidating data
async function refreshData(slug: string) {
	"use server";
	await new Promise((resolve) => setTimeout(resolve, 500)); // Demo loading state
	revalidateTag(slug);
}

// Load fonts as Buffer for Node.js as specified in Satori docs - using React's cache
const loadFont = cache(() => {
	try {
		const blockKieFont = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/BlockKie.ttf")),
		);
		const geneva9Font = Buffer.from(
			fs.readFileSync(path.resolve("./public/fonts/geneva-9.ttf")),
		);
		console.log("Fonts loaded successfully");
		return { blockKie: blockKieFont, geneva9: geneva9Font };
	} catch (error) {
		console.error("Error loading fonts:", error);
		return null;
	}
});

// Cache the fonts at module initialization
const fonts = loadFont();

// Define a type for the recipe configuration
type RecipeConfig = (typeof screens)[keyof typeof screens] & {
	renderSettings?: {
		// Consolidate into a single property for double sizing
		doubleSizeForSharperText?: boolean;
		[key: string]: boolean | string | number | undefined;
	};
};

// Fetch recipe configuration
const fetchConfig = cache((slug: string): RecipeConfig | null => {
	const config = screens[slug as keyof typeof screens];
	if (!config || (!config.published && process.env.NODE_ENV === "production")) {
		return null;
	}
	return config as RecipeConfig;
});

// Fetch component for a recipe
const fetchComponent = cache(async (slug: string) => {
	try {
		const { default: Component } = await import(
			`@/app/recipes/screens/${slug}/${slug}.tsx`
		);
		return Component;
	} catch (error) {
		console.error(`Error loading component for ${slug}:`, error);
		return null;
	}
});

// Fetch props for a recipe
const fetchProps = cache(async (slug: string, config: RecipeConfig) => {
	let props = config.props || {};

	if (!config.hasDataFetch) {
		return props;
	}

	try {
		const { default: fetchDataFunction } = await import(
			`@/app/recipes/screens/${slug}/getData.ts`
		);

		// Set a timeout for data fetching to prevent hanging
		const fetchPromise = fetchDataFunction();
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
		});

		// Race between the fetch and the timeout
		const fetchedData = await Promise.race([fetchPromise, timeoutPromise])
			.catch((error) => {
				console.warn(`Data fetch error for ${slug}:`, error);
				return null;
			});

		// Check if the fetched data is valid
		if (fetchedData && typeof fetchedData === "object") {
			props = fetchedData;
		} else {
			console.warn(`Invalid or missing data for ${slug}`);
		}
	} catch (error) {
		console.error(`Error fetching data for ${slug}:`, error);
	}

	return props;
});

// Get image options for rendering
const getImageOptions = (config: RecipeConfig) => {
	// Use doubleSizeForSharperText as the single source of truth for doubling
	const useDoubling = config.renderSettings?.doubleSizeForSharperText ?? false;
	const scaleFactor = useDoubling ? 2 : 1;

	return {
		width: 800 * scaleFactor,
		height: 480 * scaleFactor,
		fonts: [
			...(fonts?.blockKie
				? [
					{
						name: "BlockKie",
						data: fonts.blockKie,
						weight: 400 as const,
						style: "normal" as const,
					},
				]
				: []),
			...(fonts?.geneva9
				? [
					{
						name: "Geneva9",
						data: fonts.geneva9,
						weight: 400 as const,
						style: "normal" as const,
					},
				]
				: []),
		],
		debug: false,
	};
};

// Generate static params for all recipes
export async function generateStaticParams() {
	return Object.keys(screens).map((slug) => ({ slug }));
}

// Type for component props
type ComponentProps = Record<string, unknown>;

// Type for render functions
type RenderFunction = (
	slug: string,
	Component: React.ComponentType<ComponentProps>,
	props: ComponentProps,
	config: RecipeConfig
) => Promise<Buffer | string | null>;

// Render functions for different formats
const renderFormats: Record<string, RenderFunction> = {
	// Generate bitmap
	bitmap: cache(async (
		slug: string,
		Component: React.ComponentType<ComponentProps>,
		props: ComponentProps,
		config: RecipeConfig
	) => {
		try {
			console.log(`🔄 Generating fresh bitmap for: ${slug}`);
			const pngResponse = await new ImageResponse(
				createElement(Component, props),
				getImageOptions(config),
			);
			const buffer = await renderBmp(pngResponse);

			if (buffer) {
				console.log(`✅ Successfully generated bitmap for: ${slug}`);
				return buffer;
			}
			return null;
		} catch (error) {
			console.error(`Error generating bitmap for ${slug}:`, error);
			return null;
		}
	}),

	// Generate PNG
	png: cache(async (
		slug: string,
		Component: React.ComponentType<ComponentProps>,
		props: ComponentProps,
		config: RecipeConfig
	) => {
		try {
			console.log(`🔄 Generating fresh PNG for: ${slug}`);
			const pngResponse = await new ImageResponse(
				createElement(Component, props),
				getImageOptions(config),
			);

			const pngBuffer = await pngResponse.arrayBuffer();
			console.log(`✅ Successfully generated PNG for: ${slug}`);
			return Buffer.from(pngBuffer);
		} catch (error) {
			console.error(`Error generating PNG for ${slug}:`, error);
			return null;
		}
	}),

	// Generate SVG
	svg: cache(async (
		slug: string,
		Component: React.ComponentType<ComponentProps>,
		props: ComponentProps,
		config: RecipeConfig
	) => {
		try {
			console.log(`🔄 Generating fresh SVG for: ${slug}`);

			const element = createElement(Component, props);
			const svg = await satori(element, getImageOptions(config));

			console.log(`✅ Successfully generated SVG for: ${slug}`);
			return svg;
		} catch (error) {
			console.error(`Error generating SVG for ${slug}:`, error);
			return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
				<rect width="800" height="480" fill="#f0f0f0" />
				<text x="400" y="240" font-family="Arial" font-size="24" text-anchor="middle">
					Unable to generate SVG content
				</text>
			</svg>`;
		}
	})
};

// Render component with appropriate format
const RenderComponent = ({
	slug,
	format,
	title
}: {
	slug: string;
	format: "bitmap" | "png" | "svg" | "react";
	title: string;
}) => {
	// Fetch config and handle null case
	const configResult = use(Promise.resolve(fetchConfig(slug)));
	if (!configResult) {
		return <div className="w-full h-full flex items-center justify-center">Configuration not found</div>;
	}

	// Fetch component and handle null case
	const componentResult = use(Promise.resolve(fetchComponent(slug)));
	if (!componentResult) {
		return <div className="w-full h-full flex items-center justify-center">Component not found</div>;
	}

	// Now we have valid config and component
	const config = configResult;
	const Component = componentResult;
	const props = use(Promise.resolve(fetchProps(slug, config)));

	// Use doubleSizeForSharperText as the single source of truth for doubling
	const useDoubling = config.renderSettings?.doubleSizeForSharperText ?? false;

	// For React component rendering
	if (format === "react") {
		return (
			<div
				style={{
					transform: useDoubling ? 'scale(0.5)' : 'none',
					transformOrigin: 'top left',
					width: useDoubling ? '200%' : '100%',
					height: useDoubling ? '200%' : '100%'
				}}
			>
				<Component {...props} />
			</div>
		);
	}

	// For bitmap rendering
	if (format === "bitmap") {
		const bmpBuffer = use(Promise.resolve(renderFormats.bitmap(slug, Component, props, config)));
		if (!bmpBuffer) {
			return <div className="w-full h-full flex items-center justify-center">Failed to generate bitmap</div>;
		}

		return (
			<Image
				width={800}
				height={480}
				src={`data:image/bmp;base64,${(bmpBuffer as Buffer).toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} BMP render`}
				className="w-full object-cover"
			/>
		);
	}

	// For PNG rendering
	if (format === "png") {
		const pngBuffer = use(Promise.resolve(renderFormats.png(slug, Component, props, config)));
		if (!pngBuffer) {
			return <div className="w-full h-full flex items-center justify-center">Failed to generate PNG</div>;
		}

		return (
			<Image
				width={800 * (useDoubling ? 2 : 1)}
				height={480 * (useDoubling ? 2 : 1)}
				src={`data:image/png;base64,${(pngBuffer as Buffer).toString("base64")}`}
				style={{ imageRendering: "pixelated" }}
				alt={`${title} PNG render`}
				className="w-full object-cover"
			/>
		);
	}

	// For SVG rendering
	if (format === "svg") {
		const svgContent = use(Promise.resolve(renderFormats.svg(slug, Component, props, config)));
		if (!svgContent) {
			return <div className="w-full h-full flex items-center justify-center">Failed to generate SVG</div>;
		}

		return (
			<div
				className="w-full h-full"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
				dangerouslySetInnerHTML={{ __html: svgContent as string }}
				style={{
					imageRendering: "pixelated",
					transform: useDoubling ? 'scale(0.5)' : 'none',
					transformOrigin: 'top left'
				}}
				aria-label={`${title} SVG render`}
			/>
		);
	}

	return null;
};

// Main recipe page component
export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const config = await fetchConfig(slug);

	if (!config) {
		notFound();
	}

	return (
		<div className="@container">
			<div className="flex flex-col">
				<div className="border-b pb-4 mb-4">
					<Suspense fallback={<div>Loading recipe details...</div>}>
						<h1 className="text-3xl font-semibold">{config.title}</h1>
						<p className="mt-2 max-w-prose">{config.description}</p>
						{config.renderSettings?.doubleSizeForSharperText && (
							<p className="text-sm text-gray-500 max-w-prose">
								This screen is rendering at double size for sharper text, but it might cause issues with the layout,
								for example overflow hidden is known to have issues with double size.
								change the setting in screens.json.
							</p>
						)}
					</Suspense>
				</div>

				<RecipePreviewLayout
					bmpComponent={
						<div className="w-[800px] h-[480px] border border-gray-200 overflow-hidden rounded-sm">
							<AspectRatio ratio={5 / 3}>
								<Suspense fallback={<div className="w-full h-full flex items-center justify-center">Rendering bitmap...</div>}>
									<RenderComponent slug={slug} format="bitmap" title={config.title} />
								</Suspense>
							</AspectRatio>
						</div>
					}
					pngComponent={
						<div className="w-[800px] h-[480px] border border-gray-200 overflow-hidden rounded-sm">
							<AspectRatio ratio={5 / 3}>
								<Suspense fallback={<div className="w-full h-full flex items-center justify-center">Rendering PNG...</div>}>
									<RenderComponent slug={slug} format="png" title={config.title} />
								</Suspense>
							</AspectRatio>
						</div>
					}
					svgComponent={
						<div className="w-[800px] h-[480px] border border-gray-200 overflow-hidden rounded-sm">
							<AspectRatio ratio={5 / 3}>
								<Suspense fallback={<div className="w-full h-full flex items-center justify-center">Rendering SVG...</div>}>
									<RenderComponent slug={slug} format="svg" title={config.title} />
								</Suspense>
							</AspectRatio>
						</div>
					}
					reactComponent={
						<div className="w-[800px] h-[480px] border border-gray-200 overflow-hidden rounded-sm">
							<AspectRatio ratio={5 / 3} className="w-[800px] h-[480px]">
								<Suspense fallback={<div className="w-full h-full flex items-center justify-center">Rendering recipe...</div>}>
									<RenderComponent slug={slug} format="react" title={config.title} />
								</Suspense>
							</AspectRatio>
						</div>
					}
					bmpLinkComponent={
						<p className="leading-7 text-xs">
							JSX → utils/pre-satori.tsx → Satori SVG → ImageResponse PNG → utils/render-bmp.ts →
							<Link href={`/api/bitmap/${slug}.bmp`} className="hover:underline text-blue-600 dark:text-blue-400">
								/api/bitmap/{slug}.bmp
							</Link>
						</p>
					}
					pngLinkComponent={
						<p className="leading-7 text-xs">
							JSX → utils/pre-satori.tsx → Satori SVG → <span className="text-blue-600 dark:text-blue-400">ImageResponse PNG</span> → utils/render-bmp.ts →
							<Link href={`/api/bitmap/${slug}.bmp`} className="hover:underline">
								/api/bitmap/{slug}.bmp
							</Link>
						</p>
					}
					svgLinkComponent={
						<p className="leading-7 text-xs">
							JSX → utils/pre-satori.tsx → <span className="text-blue-600 dark:text-blue-400">Satori SVG</span> → ImageResponse PNG → utils/render-bmp.ts →
							<Link href={`/api/bitmap/${slug}.bmp`} className="hover:underline">
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
					<Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading props...</div>}>
						<PropsDisplay slug={slug} config={config} />
					</Suspense>
				)}
			</div>
		</div>
	);
}

// Component to display props with refresh action
const PropsDisplay = ({ slug, config }: { slug: string; config: RecipeConfig }) => {
	const props = use(Promise.resolve(fetchProps(slug, config)));
	return <RecipeProps props={props} slug={slug} refreshAction={refreshData} />;
};
