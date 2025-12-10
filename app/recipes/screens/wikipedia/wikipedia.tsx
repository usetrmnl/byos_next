import { PreSatori } from "@/utils/pre-satori";
import { WikipediaData } from "./getData";

export default async function Wikipedia({
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
	"use cache";
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
		const baseLength = hasValidThumbnail
			? isHalfScreen
				? 325
				: 600
			: isHalfScreen
				? 400
				: 800;

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

	// Safe image dimensions calculation
	const getImageDimensions = () => {
		if (!hasValidThumbnail || !thumbnail)
			return { width: "240px", height: "auto" };

		try {
			// At this point we've already validated that these values exist through hasValidThumbnail
			// But to satisfy TypeScript, add additional safety checks
			const width = typeof thumbnail.width === "number" ? thumbnail.width : 240;
			const height =
				typeof thumbnail.height === "number" ? thumbnail.height : 180;
			const aspectRatio = height / width;
			const displayWidth = 240;
			const displayHeight = Math.round(displayWidth * aspectRatio);

			// Impose reasonable limits
			return {
				width: `${displayWidth}px`,
				height: `${Math.min(displayHeight, 400)}px`,
			};
		} catch (error) {
			console.error("Error calculating image dimensions:", error);
			return { width: "240px", height: "auto" };
		}
	};

	const imageDimensions = getImageDimensions();

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white">
				<div className="flex-none p-4 border-b border-black">
					<h1 className={` ${isHalfScreen ? "text-4xl" : "text-5xl"}`}>
						{safeTitle}
					</h1>
				</div>
				<div className="flex flex-col flex-1 p-4 pb-0 sm:flex-row">
					<div className="text-2xl flex flex-grow tracking-tight leading-none">
						{truncatedExtract}
					</div>
					{hasValidThumbnail && thumbnail?.source && !isHalfScreen && (
						<div className="pt-8 sm:pt-0 sm:pr-4 w-full sm:w-[240px] items-center justify-center">
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
										maxWidth: "240px",
										maxHeight: "320px",
										objectFit: "contain",
										filter: "grayscale(100%) contrast(0.9) brightness(1.05)",
									}}
								/>
							</picture>
						</div>
					)}
				</div>
				<div className="flex-none p-4 pt-2 flex flex-col">
					<div className="text-base font-geneva9 flex justify-between w-full ">
						<span>{safeContentUrl}</span>
						<span>
							{safeDescription && safeDescription.length > 100
								? `${safeDescription.substring(0, 100)}...`
								: safeDescription}
						</span>
					</div>

					<div className="w-full flex flex-col sm:flex-row  sm:justify-between items-center text-2xl text-white p-2 rounded-xl bg-gray-500">
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
