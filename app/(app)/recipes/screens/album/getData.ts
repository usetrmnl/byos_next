import {
	type AlbumCityId,
	DEFAULT_ALBUM_CITY_ID,
	getAlbumCity,
} from "./album-cities";

export const dynamic = "force-dynamic";

export type AlbumParams = {
	city?: AlbumCityId | string;
	imageUrl?: string;
};

export type AlbumData = {
	imageUrl: string;
	timezone: string;
	cityLabel: string;
	clockTime: string;
	locationLabel: string;
	embeddedImageUrl?: string;
	ditheredImageUrl?: string;
	message?: string;
};

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT =
	"BYOS-Next/1.0 (album recipe; +https://github.com/ghcpuman902/byos_next)";

const fetchWikipediaThumbnail = async (
	title: string,
): Promise<string | null> => {
	const params = new URLSearchParams({
		action: "query",
		titles: title,
		prop: "pageimages",
		pithumbsize: "1280",
		format: "json",
	});

	try {
		const response = await fetch(`${WIKIPEDIA_API}?${params}`, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(10_000),
			cache: "no-store",
		});
		if (!response.ok) return null;

		const payload = (await response.json()) as {
			query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
		};
		const pages = payload.query?.pages;
		if (!pages) return null;

		for (const page of Object.values(pages)) {
			const source = page.thumbnail?.source;
			if (typeof source === "string" && source.startsWith("https://")) {
				return source;
			}
		}
	} catch (error) {
		console.warn("[album:getData] Wikipedia thumbnail fetch failed:", error);
	}

	return null;
};

const resolveImageUrl = async (
	customUrl: string | undefined,
	wikipediaTitle: string,
): Promise<{ imageUrl: string; message?: string }> => {
	const trimmed = customUrl?.trim();
	if (trimmed && /^https?:\/\//i.test(trimmed)) {
		return { imageUrl: trimmed };
	}

	const thumbnail = await fetchWikipediaThumbnail(wikipediaTitle);
	if (thumbnail) {
		return { imageUrl: thumbnail };
	}

	return {
		imageUrl: "",
		message: `Could not load a Wikipedia photo for ${wikipediaTitle}. Add a custom image URL instead.`,
	};
};

const formatClockTime = (timezone: string, now: Date): string =>
	now.toLocaleTimeString("en-GB", {
		timeZone: timezone,
		hour12: true,
		hour: "2-digit",
		minute: "2-digit",
	});

const formatLocationLabel = (
	cityLabel: string,
	timezone: string,
	now: Date,
): string => {
	const tzLabel =
		new Intl.DateTimeFormat("en-GB", {
			timeZone: timezone,
			timeZoneName: "short",
		})
			.formatToParts(now)
			.find((part) => part.type === "timeZoneName")?.value ?? "";

	return `${cityLabel}${tzLabel ? ` ${tzLabel}` : ""}`;
};

export default async function getData(
	params?: AlbumParams,
): Promise<AlbumData> {
	const city = getAlbumCity(params?.city ?? DEFAULT_ALBUM_CITY_ID);
	const resolved = await resolveImageUrl(params?.imageUrl, city.wikipediaTitle);
	const now = new Date();

	return {
		imageUrl: resolved.imageUrl,
		timezone: city.timezone,
		cityLabel: city.label,
		clockTime: formatClockTime(city.timezone, now),
		locationLabel: formatLocationLabel(city.label, city.timezone, now),
		...(resolved.message ? { message: resolved.message } : {}),
	};
}
