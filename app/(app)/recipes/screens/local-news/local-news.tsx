import { z } from "zod";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";
import getLocalNews, {
	compactNumber,
	type LocalNewsData,
	type NewsStory,
} from "./getData";

export const paramsSchema = z.object({
	location: z
		.string()
		.default("San Francisco")
		.describe("City or place name to fetch nearby headlines for")
		.meta({ title: "Location", placeholder: "Paris" }),
	topic: z
		.string()
		.default("top stories")
		.describe("News query to combine with the location")
		.meta({ title: "Topic", placeholder: "technology" }),
	locale: z
		.string()
		.default("en-US")
		.describe("Google News locale such as en-US, fr-FR, or en-GB")
		.meta({ title: "Locale", placeholder: "en-US" }),
});

export const dataSchema = z.object({
	location: z.string().default("San Francisco"),
	topic: z.string().default("top stories"),
	locale: z.string().default("en-US"),
	subreddit: z.string().default("sanfrancisco"),
	generatedAt: z.string().default("Now"),
	stories: z
		.array(
			z.object({
				title: z.string(),
				source: z.string(),
				url: z.string(),
				publishedAt: z.string(),
				age: z.string(),
				summary: z.string(),
				score: z.number(),
				comments: z.number(),
				author: z.string(),
				domain: z.string(),
			}),
		)
		.default([]),
});

type LocalNewsProps = Partial<LocalNewsData> & {
	width?: number;
	height?: number;
};

const fallbackStories: NewsStory[] = [
	{
		title: "Connect a subreddit to see live local discussion",
		source: "self.localnews",
		url: "https://reddit.com",
		publishedAt: "Today",
		age: "Latest",
		summary:
			"Set the recipe location parameter to your city to pull from r/{city}.",
		score: 0,
		comments: 0,
		author: "system",
		domain: "self",
	},
];

function truncate(value: string, maxLength: number): string {
	if (!value) return "";
	if (value.length <= maxLength) return value;
	const clean = value.slice(0, maxLength - 1).trimEnd();
	return `${clean}…`;
}

function safeStory(story: NewsStory | undefined): NewsStory {
	const base = story ?? fallbackStories[0];
	return {
		title: base.title ?? "",
		source: base.source ?? "",
		url: base.url ?? "",
		publishedAt: base.publishedAt ?? "",
		age: base.age ?? "",
		summary: base.summary ?? "",
		score: base.score ?? 0,
		comments: base.comments ?? 0,
		author: base.author ?? "",
		domain: base.domain ?? "",
	};
}

export default function LocalNews({
	location = "sanfrancisco",
	subreddit,
	generatedAt = "Now",
	stories = fallbackStories,
	width = 800,
	height = 480,
}: LocalNewsProps) {
	const isHalfScreen = width === 400 && height === 480;
	const lead = safeStory(stories[0]);
	const secondary = stories
		.slice(1, isHalfScreen ? 3 : 4)
		.map((s) => safeStory(s));

	const sub = subreddit || location;
	const totalScore = stories.reduce((acc, s) => acc + (s.score ?? 0), 0);
	const totalComments = stories.reduce((acc, s) => acc + (s.comments ?? 0), 0);

	// Larger canvases (TRMNL X 1872×1404, e-readers) get more secondary posts +
	// longer summary truncation. The truncate caps grow with available width
	// so text fills the column width at every device size.
	const titleCap = isHalfScreen ? 90 : width >= 1280 ? 220 : 130;
	const summaryCap = isHalfScreen ? 140 : width >= 1280 ? 420 : 240;
	const secondaryTitleCap = isHalfScreen ? 80 : width >= 1280 ? 160 : 95;
	const secondarySummaryCap = width >= 1280 ? 220 : 120;

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-4 lg:p-6 2xl:p-10 gap-3 lg:gap-5 2xl:gap-8 text-black">
				{/* Lead post */}
				<div className="flex flex-col rounded-xl border-2 border-black p-3 lg:p-5 2xl:p-8">
					<div className="flex items-center justify-between font-geneva9 text-base lg:text-xl 2xl:text-2xl uppercase tracking-[0.18em]">
						<span>r/{truncate(sub, 22)} · top</span>
						<span>{lead.age} ago</span>
					</div>
					<div
						className={
							isHalfScreen
								? "mt-1 font-inter text-xl leading-[0.98]"
								: "mt-1 lg:mt-3 font-inter text-3xl lg:text-5xl 2xl:text-6xl leading-[1.05]"
						}
					>
						{truncate(lead.title, titleCap)}
					</div>
					{lead.summary ? (
						<div
							className={
								isHalfScreen
									? "mt-2 font-inter text-sm leading-tight"
									: "mt-2 lg:mt-4 font-inter text-base lg:text-2xl 2xl:text-3xl leading-snug"
							}
						>
							{truncate(lead.summary, summaryCap)}
						</div>
					) : null}
					<div className="mt-2 lg:mt-4 flex items-center justify-between border-t border-black pt-2 lg:pt-4 font-geneva9 text-sm lg:text-lg 2xl:text-xl uppercase tracking-[0.1em]">
						<span>
							▲ {compactNumber(lead.score)} · 💬 {compactNumber(lead.comments)}
						</span>
						<span>
							u/{truncate(lead.author, 14)} · {truncate(lead.domain, 18)}
						</span>
					</div>
				</div>

				{/* Secondary posts */}
				<div
					className={
						isHalfScreen
							? "flex flex-1 flex-col gap-2"
							: "flex flex-1 flex-row gap-2 lg:gap-4 2xl:gap-6"
					}
				>
					{secondary.map((story, index) => (
						<div
							key={`${story.title}-${index}`}
							className="flex flex-1 flex-col rounded-xl border border-black p-2 lg:p-4 2xl:p-6"
						>
							<div className="flex items-center justify-between font-geneva9 text-xs lg:text-base 2xl:text-lg uppercase tracking-[0.1em]">
								<span>
									{String(index + 2).padStart(2, "0")} · ▲{" "}
									{compactNumber(story.score)}
								</span>
								<span>{story.age}</span>
							</div>
							<div className="mt-1 lg:mt-3 font-inter text-base lg:text-2xl 2xl:text-3xl leading-[1.1]">
								{truncate(story.title, secondaryTitleCap)}
							</div>
							{story.summary ? (
								<div className="mt-1 lg:mt-3 font-inter text-xs lg:text-base 2xl:text-lg leading-tight">
									{truncate(story.summary, secondarySummaryCap)}
								</div>
							) : null}
							<div className="mt-auto pt-1 lg:pt-3 font-geneva9 text-xs lg:text-base 2xl:text-lg uppercase tracking-[0.08em]">
								💬 {compactNumber(story.comments)} ·{" "}
								{truncate(story.domain, 22)}
							</div>
						</div>
					))}
				</div>

				{/* Footer */}
				<div className="flex w-full flex-row justify-between items-center rounded-xl bg-gray-500 p-2 lg:p-4 text-xl lg:text-3xl 2xl:text-4xl text-white">
					<div>
						{stories.length} posts · ▲ {compactNumber(totalScore)} · 💬{" "}
						{compactNumber(totalComments)}
					</div>
					<div>Updated {generatedAt}</div>
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
		slug: "local-news",
		title: "Local News",
		description:
			"A premium local news dashboard powered by Google News RSS. Shows the latest headlines for a configurable location and topic.",
		published: true,
		tags: ["tailwind", "news", "api", "live-data", "configurable", "premium"],
		author: { name: "rbouteiller", github: "" },
		category: "display-components",
		version: "0.1.0",
		createdAt: "2026-04-26T00:00:00Z",
		updatedAt: "2026-04-26T00:00:00Z",
		renderSettings: { doubleSizeForSharperText: true },
	},
	paramsSchema,
	dataSchema,
	getData: async (params) => {
		const data = await getLocalNews(params);
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, data }) => (
		<LocalNews
			{...(data as Partial<LocalNewsData>)}
			width={width}
			height={height}
		/>
	),
};
