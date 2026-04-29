import { PreSatori } from "@/utils/pre-satori";
import { compactNumber, type LocalNewsData, type NewsStory } from "./getData";

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

	return (
		<PreSatori width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-4 text-black">
				{/* Lead post */}
				<div className="flex flex-col rounded-xl border-2 border-black p-3">
					<div className="flex items-center justify-between font-geneva9 text-base uppercase tracking-[0.18em]">
						<span>r/{truncate(sub, 22)} · top</span>
						<span>{lead.age} ago</span>
					</div>
					<div
						className={`mt-1 font-inter leading-[0.98] ${isHalfScreen ? "text-xl" : "text-3xl"}`}
					>
						{truncate(lead.title, isHalfScreen ? 90 : 130)}
					</div>
					{lead.summary ? (
						<div
							className={`mt-2 font-inter leading-tight ${isHalfScreen ? "text-sm" : "text-base"}`}
						>
							{truncate(lead.summary, isHalfScreen ? 140 : 240)}
						</div>
					) : null}
					<div className="mt-2 flex items-center justify-between border-t border-black pt-2 font-geneva9 text-sm uppercase tracking-[0.1em]">
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
					className={`mt-3 flex flex-1 ${isHalfScreen ? "flex-col gap-2" : "flex-row gap-2"}`}
				>
					{secondary.map((story, index) => (
						<div
							key={`${story.title}-${index}`}
							className="flex flex-1 flex-col rounded-xl border border-black p-2"
						>
							<div className="flex items-center justify-between font-geneva9 text-xs uppercase tracking-[0.1em]">
								<span>
									{String(index + 2).padStart(2, "0")} · ▲{" "}
									{compactNumber(story.score)}
								</span>
								<span>{story.age}</span>
							</div>
							<div
								className={`mt-1 font-inter leading-[1.05] ${isHalfScreen ? "text-base" : "text-base"}`}
							>
								{truncate(story.title, isHalfScreen ? 80 : 95)}
							</div>
							{story.summary ? (
								<div className="mt-1 font-inter text-xs leading-tight">
									{truncate(story.summary, 120)}
								</div>
							) : null}
							<div className="mt-auto pt-1 font-geneva9 text-xs uppercase tracking-[0.08em]">
								💬 {compactNumber(story.comments)} ·{" "}
								{truncate(story.domain, 22)}
							</div>
						</div>
					))}
				</div>

				{/* Footer */}
				<div className="mt-3 flex w-full flex-row justify-between items-center rounded-xl bg-gray-500 p-2 text-xl text-white">
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
