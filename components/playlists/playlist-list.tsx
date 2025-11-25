import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FormattedDate } from "@/components/ui/formatted-date";
import { Playlist } from "@/lib/supabase/types";

interface PlaylistListProps {
	playlists: Playlist[];
	onEditPlaylist?: (playlist: Playlist) => void;
	onDeletePlaylist?: (playlistId: string) => void;
	isLoading?: boolean;
}

export function PlaylistList({
	playlists,
	onEditPlaylist,
	onDeletePlaylist,
	isLoading = false,
}: PlaylistListProps) {
	if (playlists.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="text-muted-foreground mb-4">
					No playlists found. Create your first playlist to get started.
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{playlists.map((playlist) => (
				<Card key={playlist.id} className="hover:shadow-md transition-shadow">
					<CardHeader>
						<div className="flex justify-between items-start">
							<div>
								<CardTitle className="text-lg">{playlist.name}</CardTitle>
								<CardDescription>
									<FormattedDate dateString={playlist.updated_at} />
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => onEditPlaylist?.(playlist)}
								disabled={isLoading}
							>
								<Edit className="h-4 w-4 mr-1" />
								Edit
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="text-destructive hover:text-destructive"
								onClick={() => onDeletePlaylist?.(playlist.id)}
								disabled={isLoading}
							>
								<Trash2 className="h-4 w-4 mr-1" />
								Delete
							</Button>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
