import { Edit, Trash2 } from "lucide-react";
import screens from "@/app/(app)/recipes/screens.json";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormattedDate } from "@/components/ui/formatted-date";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { Playlist, PlaylistItem } from "@/lib/types";

interface PlaylistListProps {
	playlists: Playlist[];
	playlistItems: PlaylistItem[];
	onEditPlaylist?: (playlist: Playlist) => void;
	onDeletePlaylist?: (playlistId: string) => void;
	isLoading?: boolean;
}

export function PlaylistList({
	playlists,
	playlistItems,
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

	const itemsByPlaylist = playlistItems.reduce<Record<string, PlaylistItem[]>>(
		(acc, item) => {
			if (!item.playlist_id) return acc;
			if (!acc[item.playlist_id]) acc[item.playlist_id] = [];
			acc[item.playlist_id].push(item);
			return acc;
		},
		{},
	);

	const getScreenTitle = (screenId: string) =>
		screens[screenId as keyof typeof screens]?.title || screenId;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{playlists.map((playlist) => {
				const items =
					itemsByPlaylist[playlist.id]
						?.slice()
						.sort(
							(a, b) =>
								(a.order_index ?? Number.MAX_SAFE_INTEGER) -
								(b.order_index ?? Number.MAX_SAFE_INTEGER),
						) || [];
				const previewItems = items.slice(0, 3);
				const firstItem = items[0];
				const firstScreenId = firstItem?.screen_id;
				const firstDuration = firstItem?.duration;
				const firstTitle = firstScreenId ? getScreenTitle(firstScreenId) : null;
				const remainingCount = items.length > 3 ? items.length - 3 : 0;

				return (
					<div
						key={playlist.id}
						className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
					>
						<AspectRatio
							ratio={DEFAULT_IMAGE_WIDTH / DEFAULT_IMAGE_HEIGHT}
							className="bg-neutral-100 flex items-center justify-center p-0 border-b relative"
						>
							{previewItems.length > 0 ? (
								<div
									className="absolute inset-0 grid h-full w-full"
									style={{
										gridTemplateColumns: `repeat(${previewItems.length}, minmax(0, 1fr))`,
									}}
								>
									{previewItems.map((item, idx) => (
										<div
											key={item.id}
											className="relative overflow-hidden border-r last:border-r-0"
										>
											<picture>
												<source
													srcSet={`/api/bitmap/${item.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
													type="image/bmp"
												/>
												<img
													src={`/api/bitmap/${item.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
													alt={`${getScreenTitle(item.screen_id)} preview`}
													width={DEFAULT_IMAGE_WIDTH}
													height={DEFAULT_IMAGE_HEIGHT}
													className="object-cover w-full h-full"
													style={{ imageRendering: "pixelated" }}
												/>
											</picture>
											<div className="absolute bottom-2 left-2 rounded bg-black/60 text-white text-[10px] px-2 py-1">
												#{idx + 1} · {item.duration}s
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="text-muted-foreground text-sm">
									No screens added yet
								</div>
							)}
							{remainingCount > 0 && (
								<div className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-xs px-2 py-1">
									+{remainingCount} more
								</div>
							)}
						</AspectRatio>

						<div className="p-4 flex flex-col flex-grow">
							<h4 className="scroll-m-20 text-xl font-semibold tracking-tight group-hover:text-blue-600 transition-colors">
								{playlist.name}
							</h4>
							<p className="text-gray-600 text-sm mt-2 mb-4 flex-grow">
								{items.length > 0
									? `Rotates ${items.length} screen${items.length === 1 ? "" : "s"} in order. First up: ${
											firstTitle || "Unknown screen"
										} (${firstDuration ?? "?"}s).`
									: "Add screens to this playlist to start rotating content."}
							</p>

							<div className="flex flex-wrap gap-2 mt-auto">
								{previewItems.map((item) => (
									<Badge key={item.id} variant="outline">
										{getScreenTitle(item.screen_id)} · {item.duration}s
									</Badge>
								))}
								{remainingCount > 0 && (
									<Badge variant="outline">+{remainingCount} more</Badge>
								)}
							</div>

							<div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
								<span>
									{items.length > 0
										? `${items.length} item${items.length === 1 ? "" : "s"}`
										: "No items"}
								</span>
								{playlist.updated_at ? (
									<FormattedDate dateString={playlist.updated_at} />
								) : (
									<span className="text-muted-foreground">No date</span>
								)}
							</div>

							<div className="mt-4 flex gap-2">
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
						</div>
					</div>
				);
			})}
		</div>
	);
}
