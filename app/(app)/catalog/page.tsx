import {
	fetchCatalogResult,
	fetchTrmnlRecipesPage,
	isExternalCatalogEnabled,
} from "@/lib/catalog";
import { CatalogPage as CatalogClient } from "./catalog-grid";

export const metadata = {
	title: "Catalog",
	description: "Browse TRMNL official and community recipe catalogs.",
};

export default async function CatalogPage() {
	const [community, official] = await Promise.all([
		fetchCatalogResult(),
		fetchTrmnlRecipesPage(1),
	]);

	return (
		<CatalogClient
			communityEntries={community.entries}
			communityError={community.error}
			externalCatalogEnabled={isExternalCatalogEnabled()}
			officialEntries={official.recipes}
			officialError={official.error}
			officialNextPage={official.nextPage}
			officialTotal={official.total}
		/>
	);
}
