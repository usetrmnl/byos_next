import { z } from "zod";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";
import getWikipediaData, { WikipediaData } from "./getData";

export const paramsSchema = z.object({});

export const dataSchema = z.object({
	title: z.string().default("no data received"),
	extract: z.string().default("Article content is unavailable."),
	thumbnail: z
		.object({
			source: z.string().optional(),
			width: z.number().optional(),
			height: z.number().optional(),
		})
		.optional(),
	content_urls: z
		.object({
			desktop: z.object({ page: z.string() }),
		})
		.optional(),
	pageid: z.number().optional(),
	fullurl: z.string().optional(),
	canonicalurl: z.string().optional(),
	displaytitle: z.string().optional(),
	description: z.string().optional(),
	ns: z.number().optional(),
	contentmodel: z.string().optional(),
	pagelanguage: z.string().optional(),
	pagelanguagedir: z.string().optional(),
	touched: z.string().optional(),
	lastrevid: z.number().optional(),
	length: z.number().optional(),
	editurl: z.string().optional(),
	type: z.string().optional(),
	categories: z.array(z.string()).optional(),
});

export default function Wikipedia({
	title = "no data received",
	extract = "Article content is unavailable.",
	thumbnail,
	content_urls,
	description,
	fullurl,
	displaytitle,
	width = 800,
	height = 480,
}: WikipediaData & { width?: number; height?: number }) {
	// Sanitize the data to ensure we only work with valid inputs
	const safeTitle =
		title ||
		displaytitle?.replace(/<[^>]*>?/g, "").trim() ||
		"Wikipedia Article"; // display title contains html, need to be stripped
	const safeExtract = extract || "Article content is unavailable.";
	const safeDescription = typeof description === "string" ? description : "";

	const isHalfScreen = width === 400 && height === 480;

	// Use fullurl if available, otherwise fall back to content_urls
	const safeContentUrl =
		fullurl || content_urls?.desktop?.page || "https://en.wikipedia.org";

	// Enhanced thumbnail validation to catch more edge cases
	const hasValidThumbnail = thumbnail?.source
		? typeof thumbnail.source === "string" &&
			thumbnail.source.startsWith("https://") &&
			typeof thumbnail.width === "number" &&
			thumbnail.width > 0 &&
			typeof thumbnail.height === "number" &&
			thumbnail.height > 0
		: false;

	// Calculate a more appropriate extract length based on content length
	// This helps prevent overflow while maintaining readability
	const calculateExtractLength = () => {
		if (!safeExtract) return "";

		// Base length for truncation - adjusted based on thumbnail presence
		// and the actual canvas size (a 1872×1404 e-reader fits ~3× the text
		// of an 800×480 device, so we let the extract grow with the canvas).
		const canvasAreaScale = Math.max(1, (width * height) / (800 * 480));
		const baseLengthRaw = hasValidThumbnail
			? isHalfScreen
				? 325
				: 600
			: isHalfScreen
				? 400
				: 800;
		const baseLength = Math.round(baseLengthRaw * canvasAreaScale);

		if (safeExtract.length <= baseLength) return safeExtract;

		console.log("baseLength", baseLength, "safeExtract", safeExtract.length);

		// Find the last period within the limit to truncate at a natural break
		const lastPeriodIndex = safeExtract.lastIndexOf(".", baseLength);
		console.log("lastPeriodIndex", lastPeriodIndex);
		if (lastPeriodIndex > baseLength * 0.8) {
			return `${safeExtract.substring(0, lastPeriodIndex + 1)}`;
		}

		return `${safeExtract.substring(0, baseLength)}...`;
	};

	const truncatedExtract = calculateExtractLength();

	// Format current server time at render
	const formattedDate = new Date().toLocaleDateString("en-GB", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	// Thumbnail target width grows with canvas — 240px on TRMNL OG (800w),
	// up to ~30% of canvas width on bigger devices.
	const thumbnailDisplayWidth = Math.max(240, Math.round(width * 0.18));
	const thumbnailDisplayMaxHeight = Math.round(height * 0.5);

	// Safe image dimensions calculation
	const getImageDimensions = () => {
		if (!hasValidThumbnail || !thumbnail)
			return { width: `${thumbnailDisplayWidth}px`, height: "auto" };

		try {
			const thumbWidth =
				typeof thumbnail.width === "number" ? thumbnail.width : 240;
			const thumbHeight =
				typeof thumbnail.height === "number" ? thumbnail.height : 180;
			const aspectRatio = thumbHeight / thumbWidth;
			const displayHeight = Math.round(thumbnailDisplayWidth * aspectRatio);

			return {
				width: `${thumbnailDisplayWidth}px`,
				height: `${Math.min(displayHeight, thumbnailDisplayMaxHeight)}px`,
			};
		} catch (error) {
			console.error("Error calculating image dimensions:", error);
			return { width: `${thumbnailDisplayWidth}px`, height: "auto" };
		}
	};

	const imageDimensions = getImageDimensions();

	return (
		<PreSatori width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white text-black">
				<div className="flex-none p-4 lg:p-8 2xl:p-12 border-b border-black">
					<h1
						className={
							isHalfScreen ? "text-4xl" : "text-5xl lg:text-7xl 2xl:text-8xl"
						}
					>
						{safeTitle}
					</h1>
				</div>
				<div className="flex flex-col flex-1 p-4 lg:p-8 2xl:p-12 pb-0 sm:flex-row">
					<div className="text-2xl lg:text-4xl 2xl:text-5xl flex flex-grow tracking-tight leading-tight lg:leading-snug">
						{truncatedExtract}
					</div>
					{hasValidThumbnail && thumbnail?.source && !isHalfScreen && (
						<div
							className="pt-8 sm:pt-0 sm:pr-4 lg:pr-8 w-full items-center justify-center flex-none"
							style={{ width: imageDimensions.width }}
						>
							<picture>
								{/* YOU CANNOT USE NEXTJS IMAGE COMPONENT HERE, BECAUSE SATORI DOES NOT SUPPORT IT */}
								<source srcSet={thumbnail.source} type="image/webp" />
								<img
									src={thumbnail.source}
									alt={safeTitle}
									width={thumbnail.width || 240}
									height={thumbnail.height || 200}
									style={{
										width: imageDimensions.width,
										height: imageDimensions.height,
										objectFit: "contain",
										filter: "grayscale(100%) contrast(0.9) brightness(1.05)",
									}}
								/>
							</picture>
						</div>
					)}
				</div>
				<div className="flex-none p-4 lg:p-8 2xl:p-12 pt-2 lg:pt-4 flex flex-col">
					<div className="text-base lg:text-2xl 2xl:text-3xl font-geneva9 flex justify-between w-full ">
						<span>{safeContentUrl}</span>
						<span>
							{safeDescription && safeDescription.length > 100
								? `${safeDescription.substring(0, 100)}...`
								: safeDescription}
						</span>
					</div>

					<div className="w-full flex flex-col sm:flex-row sm:justify-between items-center text-2xl lg:text-3xl 2xl:text-4xl text-white p-2 lg:p-4 rounded-xl bg-gray-500">
						<span>Wikipedia • Random Article</span>
						<span>
							{formattedDate && <span>Generated: {formattedDate}</span>}
						</span>
					</div>
				</div>
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<
	typeof paramsSchema,
	typeof dataSchema
> = {
	meta: {
		slug: "wikipedia",
		title: "Wikipedia Article",
		description: "A component that displays random Wikipedia articles.",
		published: true,
		tags: ["tailwind", "text", "api", "live-data", "advanced"],
		author: { name: "Mangle Kuo", github: "ghcpuman902" },
		category: "display-components",
		version: "0.1.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-13T00:00:00Z",
		renderSettings: { doubleSizeForSharperText: true },
	},
	paramsSchema,
	dataSchema,
	getData: async () => {
		const data = await getWikipediaData();
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, data }) => (
		<Wikipedia {...(data as WikipediaData)} width={width} height={height} />
	),
};
