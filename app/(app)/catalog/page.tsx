import { fetchCatalog, fetchTrmnlRecipes } from "@/lib/catalog";
import { CatalogPage as CatalogClient } from "./catalog-grid";

export const metadata = {
	title: "Catalog",
	description: "Browse TRMNL official and community recipe catalogs.",
};

export default async function CatalogPage() {
	const [community, official] = await Promise.all([
		fetchCatalog(),
		fetchTrmnlRecipes(),
	]);

	return <CatalogClient communityEntries={community} officialEntries={official} />;
}
