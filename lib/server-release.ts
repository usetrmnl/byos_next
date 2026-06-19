/**
 * BYOS server version management service.
 * Checks GitHub for the latest published BYOS release so the dashboard can
 * notify a self-hoster when a newer server version is available.
 *
 * Mirrors lib/firmware.ts: GitHub API + 6h cache to stay well under the
 * unauthenticated rate limit.
 */

const REPO = "usetrmnl/byos_next";
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const TAGS_URL = `https://api.github.com/repos/${REPO}/tags`;

const GITHUB_HEADERS = {
	Accept: "application/vnd.github.v3+json",
	"User-Agent": "BYOS-TRMNL",
};

// 6 hours, matching the firmware checker.
const CACHE_TTL = 6 * 60 * 60 * 1000;
const REVALIDATE_SECONDS = 21600;

export interface ServerRelease {
	version: string; // e.g. "0.2.13"
	tag: string; // e.g. "v0.2.13"
	name: string; // e.g. "Release v0.2.13"
	htmlUrl: string; // GitHub release/tag page
	body: string; // markdown changelog (may be empty)
	publishedAt: string; // ISO date
}

let cachedRelease: ServerRelease | null = null;
let cacheTime = 0;

function normalizeVersion(tag: string): string {
	return tag.replace(/^v/i, "").trim();
}

/**
 * Fetch the latest published GitHub Release. Returns null when the repo has no
 * formal releases (e.g. a fork that only pushes git tags).
 */
async function fetchLatestRelease(): Promise<ServerRelease | null> {
	const response = await fetch(LATEST_RELEASE_URL, {
		headers: GITHUB_HEADERS,
		next: { revalidate: REVALIDATE_SECONDS },
	});

	if (!response.ok) return null;

	const data = await response.json();
	const tag = data.tag_name || "";
	const version = normalizeVersion(tag);
	if (!version) return null;

	return {
		version,
		tag,
		name: data.name || tag,
		htmlUrl: data.html_url || `https://github.com/${REPO}/releases`,
		body: data.body || "",
		publishedAt: data.published_at || new Date().toISOString(),
	};
}

/**
 * Fallback for repos without GitHub Releases: pick the highest semver git tag.
 */
async function fetchLatestTag(): Promise<ServerRelease | null> {
	const response = await fetch(TAGS_URL, {
		headers: GITHUB_HEADERS,
		next: { revalidate: REVALIDATE_SECONDS },
	});

	if (!response.ok) return null;

	const tags = (await response.json()) as Array<{ name?: string }>;
	if (!Array.isArray(tags) || tags.length === 0) return null;

	const { compareVersions } = await import("@/utils/helpers");
	const newest = tags
		.map((t) => t.name || "")
		.filter((name) => normalizeVersion(name).length > 0)
		.sort((a, b) => compareVersions(b, a))[0];

	if (!newest) return null;

	const version = normalizeVersion(newest);
	return {
		version,
		tag: newest,
		name: newest,
		htmlUrl: `https://github.com/${REPO}/releases/tag/${newest}`,
		body: "",
		publishedAt: new Date().toISOString(),
	};
}

/**
 * Get the latest available BYOS server release, cached for 6 hours.
 * Returns the last good value (or null) when GitHub is unreachable so the UI
 * never throws.
 */
export async function getLatestServerRelease(): Promise<ServerRelease | null> {
	const now = Date.now();

	if (cachedRelease && now - cacheTime < CACHE_TTL) {
		return cachedRelease;
	}

	try {
		const release = (await fetchLatestRelease()) ?? (await fetchLatestTag());

		if (release) {
			cachedRelease = release;
			cacheTime = now;
		}

		return release ?? cachedRelease;
	} catch (error) {
		console.error("Error fetching latest BYOS release:", error);
		return cachedRelease; // serve stale cache if we have one
	}
}

/** Clear the cache (useful for testing). */
export function clearServerReleaseCache(): void {
	cachedRelease = null;
	cacheTime = 0;
}
