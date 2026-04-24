import { PageTemplate } from "@/components/ui/page-template";
import {
	fetchCatalog,
	fetchTrmnlRecipes,
	isExternalCatalogEnabled,
} from "@/lib/catalog";
import { CatalogPage as CatalogClient } from "./catalog-grid";

export const metadata = {
	title: "Catalog",
	description: "Browse TRMNL official and community recipe catalogs.",
};

export default async function CatalogPage() {
	if (!isExternalCatalogEnabled()) {
		return (
			<PageTemplate
				title="Catalog"
				subtitle="Browse TRMNL official and community recipe catalogs."
			>
				<div className="border rounded-lg p-8 text-center text-muted-foreground">
					<p className="mb-2 font-medium">External catalog is disabled</p>
					<p className="text-sm">
						Set <code className="font-mono">ENABLE_EXTERNAL_CATALOG=true</code>{" "}
						to allow this server to reach the community catalog and the TRMNL
						official recipes API.
					</p>
				</div>
			</PageTemplate>
		);
	}

	const [community, official] = await Promise.all([
		fetchCatalog(),
		fetchTrmnlRecipes(),
	]);

	return (
		<CatalogClient communityEntries={community} officialEntries={official} />
	);
}
