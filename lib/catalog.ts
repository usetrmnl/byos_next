import yaml from "js-yaml";

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
	const res = await fetch(CATALOG_URL, { next: { revalidate: 300 } });

	if (!res.ok) {
		throw new Error(`Failed to fetch catalog: ${res.status}`);
	}

	const text = await res.text();
	const data = yaml.load(text) as Record<string, CatalogEntry>;

	return Object.values(data);
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

export async function fetchTrmnlRecipes(): Promise<TrmnlRecipe[]> {
	const all: TrmnlRecipe[] = [];
	let page = 1;

	while (true) {
		const res = await fetch(
			`${TRMNL_API_BASE}/recipes.json?sort-by=install&page=${page}`,
			{ next: { revalidate: 300 } },
		);

		if (!res.ok) {
			throw new Error(`Failed to fetch TRMNL recipes: ${res.status}`);
		}

		const json: TrmnlRecipesResponse = await res.json();
		all.push(...json.data);

		if (!json.next_page_url) break;
		page++;
	}

	const seen = new Set<number>();
	return all.filter((r) => {
		if (seen.has(r.id)) return false;
		seen.add(r.id);
		return true;
	});
}
