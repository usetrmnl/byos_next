import { Suspense } from "react";
import PlaylistsClientPage from "./client-page";
import { PageTemplate } from "@/components/ui/page-template";
import { getInitData } from "@/lib/getInitData";

export const metadata = {
	title: "Playlists",
	description: "Manage your device playlists",
};

export default async function PlaylistsPage() {
	const { playlists, playlistItems } = await getInitData();

	return (
		<PageTemplate
			title="Playlists"
			subtitle="Create and manage playlists for your TRMNL devices."
		>
			<Suspense fallback={<div>Loading playlists...</div>}>
				<PlaylistsClientPage
					initialPlaylists={playlists}
					initialPlaylistItems={playlistItems}
				/>
			</Suspense>
		</PageTemplate>
	);
}
