import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type LocalNewsParams = {
	location?: string;
	topic?: string;
	locale?: string;
};

export type NewsStory = {
	title: string;
	source: string;
	url: string;
	publishedAt: string;
	age: string;
	summary: string;
	score: number;
	comments: number;
	author: string;
	domain: string;
};

export type LocalNewsData = {
	location: string;
	topic: string;
	locale: string;
	subreddit: string;
	generatedAt: string;
	stories: NewsStory[];
};

const FALLBACK_STORIES: NewsStory[] = [
	{
		title: "Connect a subreddit to see live local discussion",
		source: "self.localnews",
		url: "https://reddit.com",
		publishedAt: "Today",
		age: "Latest",
		summary:
			"Set the recipe `location` parameter to your city (e.g. sanfrancisco, london, paris). The recipe pulls top posts from r/{city} so you see what locals are actually talking about right now.",
		score: 0,
		comments: 0,
		author: "system",
		domain: "self",
	},
];

function formatAge(epochSeconds: number): string {
	if (!epochSeconds) return "Latest";
	const minutes = Math.max(
		0,
		Math.round((Date.now() / 1000 - epochSeconds) / 60),
	);
	if (minutes < 60) return `${minutes || 1}m`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.round(hours / 24);
	return `${days}d`;
}

function formatDate(value: Date): string {
	return value.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function compactNumber(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export { compactNumber };

function locationToSubreddit(location: string): string {
	return location
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]/g, "");
}

type RedditChild = {
	data: {
		title?: string;
		selftext?: string;
		author?: string;
		score?: number;
		num_comments?: number;
		created_utc?: number;
		permalink?: string;
		url?: string;
		domain?: string;
		is_self?: boolean;
		stickied?: boolean;
		subreddit?: string;
		link_flair_text?: string | null;
	};
};

type RedditListing = {
	data?: { children?: RedditChild[] };
};

function buildSummary(child: RedditChild["data"]): string {
	const flair = child.link_flair_text ? `[${child.link_flair_text}] ` : "";
	const text = (child.selftext || "").replace(/\s+/g, " ").trim();
	if (text) return `${flair}${text}`;
	if (!child.is_self && child.url)
		return `${flair}Link → ${child.domain ?? ""}`;
	return flair.trim();
}

async function fetchSubreddit(subreddit: string): Promise<RedditChild[]> {
	const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=15&raw_json=1`;
	const response = await fetch(url, {
		headers: {
			"User-Agent": "BYOS-LocalNews/1.0 (by /u/byos_next)",
			Accept: "application/json",
		},
		next: { revalidate: 600 },
	});

	if (!response.ok) {
		throw new Error(`Reddit responded with ${response.status}`);
	}

	const json = (await response.json()) as RedditListing;
	return json.data?.children ?? [];
}

async function fetchLocalNews(
	params: Required<LocalNewsParams>,
): Promise<LocalNewsData> {
	const subreddit = locationToSubreddit(params.location);
	const children = await fetchSubreddit(subreddit);

	const stories: NewsStory[] = children
		.filter((c) => !c.data.stickied)
		.map((c) => {
			const d = c.data;
			const created = d.created_utc ?? 0;
			return {
				title: (d.title ?? "").trim(),
				source: `r/${d.subreddit ?? subreddit}`,
				url: d.permalink
					? `https://www.reddit.com${d.permalink}`
					: d.url || "https://reddit.com",
				publishedAt: created ? formatDate(new Date(created * 1000)) : "Today",
				age: formatAge(created),
				summary: buildSummary(d),
				score: d.score ?? 0,
				comments: d.num_comments ?? 0,
				author: d.author ?? "unknown",
				domain: d.is_self ? "self" : (d.domain ?? "link"),
			};
		})
		.filter((s) => s.title.length > 0)
		.slice(0, 6);

	if (stories.length === 0) {
		throw new Error(`No posts found in r/${subreddit}`);
	}

	return {
		location: params.location,
		topic: params.topic,
		locale: params.locale,
		subreddit,
		generatedAt: formatDate(new Date()),
		stories,
	};
}

function fallbackData(params: Required<LocalNewsParams>): LocalNewsData {
	return {
		location: params.location,
		topic: params.topic,
		locale: params.locale,
		subreddit: locationToSubreddit(params.location),
		generatedAt: formatDate(new Date()),
		stories: FALLBACK_STORIES,
	};
}

function normalizeParams(params?: LocalNewsParams): Required<LocalNewsParams> {
	return {
		location: params?.location?.trim() || "sanfrancisco",
		topic: params?.topic?.trim() || "hot",
		locale: params?.locale?.trim() || "en-US",
	};
}

export default async function getData(
	params?: LocalNewsParams,
): Promise<LocalNewsData> {
	const normalized = normalizeParams(params);

	try {
		const cached = unstable_cache(
			() => fetchLocalNews(normalized),
			["local-news-reddit", normalized.location, normalized.topic],
			{
				tags: ["local-news", normalized.location],
				revalidate: 600,
			},
		);
		return await cached();
	} catch (error) {
		console.error("Error fetching local news:", error);
		return fallbackData(normalized);
	}
}
