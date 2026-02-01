import { Suspense } from "react";
import { fetchRecipes } from "@/app/actions/mixup";
import { PageTemplate } from "@/components/ui/page-template";
import { getInitData } from "@/lib/getInitData";
import PlaylistsClientPage from "./client-page";

export const metadata = {
	title: "Playlists",
	description: "Manage your device playlists",
};

export default async function PlaylistsPage() {
	const [{ playlists, playlistItems }, recipes] = await Promise.all([
		getInitData(),
		fetchRecipes(),
	]);

	return (
		<PageTemplate
			title="Playlists"
			subtitle="Create and manage playlists for your TRMNL devices."
		>
			<Suspense fallback={<div>Loading playlists...</div>}>
				<PlaylistsClientPage
					initialPlaylists={playlists}
					initialPlaylistItems={playlistItems}
					recipes={recipes}
				/>
			</Suspense>
		</PageTemplate>
	);
}
