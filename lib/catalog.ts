import yaml from "js-yaml";

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
	const res = await fetch(CATALOG_URL, { next: { revalidate: 3600 } });

	if (!res.ok) {
		throw new Error(`Failed to fetch catalog: ${res.status}`);
	}

	const text = await res.text();
	const data = yaml.load(text) as Record<string, CatalogEntry>;

	return Object.values(data);
}
