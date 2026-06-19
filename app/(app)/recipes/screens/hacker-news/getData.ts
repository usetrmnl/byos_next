import qrcode from "qrcode-generator";

// Live data — always fetch fresh.
export const dynamic = "force-dynamic";

type HackerNewsParams = {
	storyCount?: number | string;
	qrTarget?: string; // "article" (default) or "comments"
};

interface Story {
	rank: number;
	title: string;
	score: number;
	comments: number;
	by: string;
	domain: string;
	qrPath: string;
	qrSize: number;
}

export interface HackerNewsData {
	stories: Story[];
	updatedLabel: string;
	message?: string;
}

const HN_API = "https://hacker-news.firebaseio.com/v0";

function toCount(v: unknown, def: number): number {
	const n = typeof v === "number" ? v : Number(v);
	if (!Number.isFinite(n)) return def;
	return Math.min(10, Math.max(1, Math.round(n)));
}

function domainOf(url: string | undefined): string {
	if (!url) return "news.ycombinator.com";
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}

// Build an SVG path (one rect per dark module) for the QR encoding `text`.
function qrPath(text: string): { qrPath: string; qrSize: number } {
	const qr = qrcode(0, "L"); // auto version, low error correction = fewer modules
	qr.addData(text);
	qr.make();
	const size = qr.getModuleCount();
	let d = "";
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
		}
	}
	return { qrPath: d, qrSize: size };
}

async function fetchJson<T>(
	url: string,
	signal: AbortSignal,
): Promise<T | null> {
	try {
		const res = await fetch(url, { signal });
		return res.ok ? ((await res.json()) as T) : null;
	} catch {
		return null;
	}
}

export default async function getData(
	params?: HackerNewsParams,
): Promise<HackerNewsData> {
	const count = toCount(params?.storyCount, 6);
	const useComments = params?.qrTarget?.trim().toLowerCase() === "comments";

	const updatedLabel = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(new Date());

	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 8000);
	try {
		const ids = await fetchJson<number[]>(
			`${HN_API}/topstories.json`,
			ctrl.signal,
		);
		if (!ids || ids.length === 0) {
			return {
				stories: [],
				updatedLabel,
				message: "Hacker News is unreachable right now.",
			};
		}

		const items = await Promise.all(
			ids.slice(0, count).map((id) =>
				fetchJson<{
					id: number;
					title?: string;
					score?: number;
					descendants?: number;
					by?: string;
					url?: string;
				}>(`${HN_API}/item/${id}.json`, ctrl.signal),
			),
		);

		const stories: Story[] = items
			.filter((it): it is NonNullable<typeof it> => Boolean(it?.title))
			.map((it, i) => {
				const hnUrl = `https://news.ycombinator.com/item?id=${it.id}`;
				const target = useComments ? hnUrl : it.url || hnUrl;
				return {
					rank: i + 1,
					title: it.title as string,
					score: it.score ?? 0,
					comments: it.descendants ?? 0,
					by: it.by ?? "",
					domain: useComments ? "news.ycombinator.com" : domainOf(it.url),
					...qrPath(target),
				};
			});

		if (stories.length === 0) {
			return {
				stories: [],
				updatedLabel,
				message: "No stories available right now.",
			};
		}
		return { stories, updatedLabel };
	} finally {
		clearTimeout(timer);
	}
}
