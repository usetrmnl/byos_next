import { PreSatori } from "@/utils/pre-satori";
import { WikipediaData } from "./getData";

export default function Wikipedia({
	title = "no data received",
	extract = "Article content is unavailable.",
	thumbnail,
	content_urls,
	description,
	fullurl,
	displaytitle,
	touched,
}: WikipediaData) {
	// Sanitize the data to ensure we only work with valid inputs
	const safeTitle =
		title ||
		displaytitle?.replace(/<[^>]*>?/g, "").trim() ||
		"Wikipedia Article"; // display title contains html, need to be stripped
	const safeExtract = extract || "Article content is unavailable.";
	const safeDescription = typeof description === "string" ? description : "";

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
		const baseLength = hasValidThumbnail ? 650 : 800;

		if (safeExtract.length <= baseLength) return safeExtract;

		// Find the last period within the limit to truncate at a natural break
		const lastPeriodIndex = safeExtract.lastIndexOf(".", baseLength);
		if (lastPeriodIndex > baseLength * 0.8) {
			return `${safeExtract.substring(0, lastPeriodIndex + 1)}`;
		}

		return `${safeExtract.substring(0, baseLength)}...`;
	};

	const truncatedExtract = calculateExtractLength();

	// Safely format the date - using touched from API if available, or current date as fallback
	let formattedDate = "";
	try {
		const dateToUse = touched ? new Date(touched) : new Date();
		formattedDate = dateToUse.toLocaleDateString("en-GB", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	} catch (error) {
		console.error("Error formatting date:", error);
		formattedDate = new Date().toString();
	}

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
		<PreSatori useDoubling={true}>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px]">
							<div className="flex-none p-4 border-b border-black">
								<h1 className="text-5xl">{safeTitle}</h1>
							</div>
							<div className="flex-1 p-4 flex flex-row">
								<div
									className="text-2xl flex-grow tracking-tight leading-none"
									style={{ textOverflow: "ellipsis", maxHeight: "240px" }}
								>
									{truncatedExtract}
								</div>
								{hasValidThumbnail && thumbnail?.source && (
									<div className="pr-4 w-[240px]">
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
													filter:
														"grayscale(100%) contrast(0.9) brightness(1.05)",
												}}
											/>
										</picture>
									</div>
								)}
							</div>
							<div className="flex-none p-4 flex flex-col">
								<div className="text-base font-geneva9 flex justify-between w-full ">
									<span>{safeContentUrl}</span>
									<span>
										{safeDescription && safeDescription.length > 100
											? safeDescription.substring(0, 100) + "..."
											: safeDescription}
									</span>
								</div>

								<div
									className="text-2xl text-black flex justify-between w-full p-2 rounded-xl dither-100"
									style={{ WebkitTextStroke: "4px white" }}
								>
									<span>Wikipedia • Random Article</span>
									{formattedDate && <span>Generated: {formattedDate}</span>}
								</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
