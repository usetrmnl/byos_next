import { Suspense } from "react";
import { PlaylistPageClient } from "@/components/playlists/playlist-page-client";
import { getInitData } from "@/lib/getInitData";

export const metadata = {
	title: "Playlists",
	description: "Manage your device playlists",
};

export default async function PlaylistsPage() {
	const { playlists, playlistItems } = await getInitData();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">Playlists</h1>
					<p className="text-muted-foreground">
						Create and manage playlists for your TRMNL devices.
					</p>
				</div>
			</div>

			<Suspense fallback={<div>Loading playlists...</div>}>
				<PlaylistPageClient
					initialPlaylists={playlists}
					initialPlaylistItems={playlistItems}
				/>
			</Suspense>
		</div>
	);
}
