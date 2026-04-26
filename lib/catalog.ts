import yaml from "js-yaml";

/**
 * External catalog fetching is opt-in. Set ENABLE_EXTERNAL_CATALOG=true to
 * allow the server to reach out to bnussbau's community catalog and
 * trmnl.com's official recipes API. Default off: the catalog page shows
 * empty state, and installCommunityRecipe refuses to run.
 */
export function isExternalCatalogEnabled(): boolean {
	return process.env.ENABLE_EXTERNAL_CATALOG === "true";
}

export const CATALOG_PAGE_SIZE = 10;

export interface CatalogSourceResult<T> {
	entries: T[];
	error: string | null;
}

export interface TrmnlRecipesPageResult {
	recipes: TrmnlRecipe[];
	currentPage: number;
	nextPage: number | null;
	total: number | null;
	error: string | null;
}

function formatFetchError(source: string, error: unknown): string {
	if (error instanceof Error && error.name === "AbortError") {
		return `${source} took too long to respond.`;
	}
	if (error instanceof Error) {
		if (error.message === "fetch failed") {
			return `${source} is unavailable right now.`;
		}
		return error.message;
	}
	return `${source} is unavailable right now.`;
}

async function fetchWithTimeout(
	url: string,
	init?: RequestInit,
	timeoutMs = 10000,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timeout);
	}
}

// --- Community catalog (GitHub YAML) ---

export interface CatalogEntry {
	name: string;
	trmnlp: {
		id: number;
		repo: string;
		zip_url: string | null;
		zip_entry_path: string | null;
		version: string;
	};
	logo_url: string | null;
	screenshot_url: string | null;
	license: string;
	byos: {
		byos_laravel?: {
			compatibility: boolean;
			compatibility_note: string | null;
			min_version: string | null;
		};
	};
	author: {
		github: string;
		name?: string;
	};
	funding: Record<string, string | string[] | undefined>;
	author_bio: {
		description: string;
		homepage?: string;
		category?: string;
		github_url?: string;
		learn_more_url?: string;
	};
}

const CATALOG_URL =
	"https://raw.githubusercontent.com/bnussbau/trmnl-recipe-catalog/refs/heads/main/catalog.yaml";

export async function fetchCatalog(): Promise<CatalogEntry[]> {
	if (!isExternalCatalogEnabled()) return [];
	const res = await fetchWithTimeout(CATALOG_URL, { cache: "no-store" });

	if (!res.ok) {
		throw new Error(`Failed to fetch catalog: ${res.status}`);
	}

	const text = await res.text();
	const data = yaml.load(text) as Record<string, CatalogEntry>;

	return Object.values(data);
}

export async function fetchCatalogResult(): Promise<
	CatalogSourceResult<CatalogEntry>
> {
	if (!isExternalCatalogEnabled()) {
		return { entries: [], error: "External catalog is disabled." };
	}

	try {
		return { entries: await fetchCatalog(), error: null };
	} catch (error) {
		return {
			entries: [],
			error: formatFetchError("Community catalog", error),
		};
	}
}

// --- TRMNL official recipes API ---

export interface TrmnlRecipe {
	id: number;
	name: string;
	published_at: string;
	icon_url: string | null;
	screenshot_url: string | null;
	author_bio: {
		name?: string;
		description?: string;
		category?: string;
		github_url?: string;
		learn_more_url?: string;
	} | null;
	stats: {
		installs: number;
		forks: number;
	};
}

interface TrmnlRecipesResponse {
	data: TrmnlRecipe[];
	total: number;
	per_page: number;
	current_page: number;
	next_page_url: string | null;
}

const TRMNL_API_BASE = "https://trmnl.com";

function uniqueTrmnlRecipes(recipes: TrmnlRecipe[]): TrmnlRecipe[] {
	const seen = new Set<number>();
	return recipes.filter((recipe) => {
		if (seen.has(recipe.id)) return false;
		seen.add(recipe.id);
		return true;
	});
}

export async function fetchTrmnlRecipesPage(
	page = 1,
): Promise<TrmnlRecipesPageResult> {
	const requestedPage = Number.isFinite(page) ? page : 1;
	const currentPage = Math.max(1, Math.floor(requestedPage));

	if (!isExternalCatalogEnabled()) {
		return {
			recipes: [],
			currentPage,
			nextPage: null,
			total: null,
			error: "External catalog is disabled.",
		};
	}

	try {
		const params = new URLSearchParams({
			"sort-by": "install",
			page: String(currentPage),
			per_page: String(CATALOG_PAGE_SIZE),
		});
		const res = await fetchWithTimeout(
			`${TRMNL_API_BASE}/recipes.json?${params.toString()}`,
			{ cache: "no-store" },
		);

		if (!res.ok) {
			return {
				recipes: [],
				currentPage,
				nextPage: null,
				total: null,
				error: `TRMNL recipes returned ${res.status}.`,
			};
		}

		const json: TrmnlRecipesResponse = await res.json();
		return {
			recipes: uniqueTrmnlRecipes(json.data),
			currentPage: json.current_page ?? currentPage,
			nextPage: json.next_page_url ? currentPage + 1 : null,
			total: json.total ?? null,
			error: null,
		};
	} catch (error) {
		return {
			recipes: [],
			currentPage,
			nextPage: null,
			total: null,
			error: formatFetchError("TRMNL recipes", error),
		};
	}
}

export async function fetchTrmnlRecipes(): Promise<TrmnlRecipe[]> {
	if (!isExternalCatalogEnabled()) return [];
	const all: TrmnlRecipe[] = [];
	let page = 1;

	while (true) {
		const result = await fetchTrmnlRecipesPage(page);
		if (result.error) {
			throw new Error(result.error);
		}
		all.push(...result.recipes);

		if (!result.nextPage) break;
		page = result.nextPage;
	}

	return uniqueTrmnlRecipes(all);
}
