import { fetchCatalog } from "@/lib/catalog";
import { CatalogGrid } from "./catalog-grid";

export const metadata = {
	title: "Catalog",
	description: "Browse the TRMNL community recipe catalog.",
};

export default async function CatalogPage() {
	const catalog = await fetchCatalog();

	return <CatalogGrid entries={catalog} />;
}
