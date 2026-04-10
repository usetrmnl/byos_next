import { WikipediaData } from "./getData";
import WithFramework from "@/components/recipes/with-framework";
import Screen from "@/components/framework-ui/screen";
import View from "@/components/framework-ui/view";
import Layout from "@/components/framework-ui/layout";
import TitleBar from "@/components/framework-ui/title-bar";
import RichText from "@/components/framework-ui/rich-text";
import Image from "@/components/framework-ui/image";

export default async function Wikipedia({
	title = "no data received",
	extract = "Article content is unavailable.",
	thumbnail,
	content_urls,
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

	return (
		<WithFramework>
			<Screen device="ogv2" bitDepth={2}>
				<View variant="full">
					<Layout>
						<RichText gap="large">
							<RichText.Content size="large">{safeTitle}</RichText.Content>
							<RichText.Content>{truncatedExtract}</RichText.Content>
						</RichText>
						{hasValidThumbnail && thumbnail?.source && (
							<Image
								src={thumbnail.source}
								width={240}
								height={300}
								fit="contain"
								bitDepth={2}
							/>
						)}
					</Layout>
					<TitleBar>
						<TitleBar.Title>Wikipedia • Random Article</TitleBar.Title>
						{formattedDate && (
							<TitleBar.Instance>
								{`Generated: ${formattedDate}`}
							</TitleBar.Instance>
						)}
					</TitleBar>
				</View>
			</Screen>
		</WithFramework>
	);
}
