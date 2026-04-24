"use client";

import { Film, Plus } from "lucide-react";
import type { Playlist, PlaylistItem, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlaylistReelCard } from "./playlist-reel-card";

interface PlaylistListProps {
	playlists: Playlist[];
	playlistItems: PlaylistItem[];
	recipes: Recipe[];
	onEditPlaylist?: (playlist: Playlist) => void;
	onDeletePlaylist?: (playlistId: string) => void;
	onCreatePlaylist?: () => void;
	isLoading?: boolean;
}

export function PlaylistList({
	playlists,
	playlistItems,
	recipes,
	onEditPlaylist,
	onDeletePlaylist,
	onCreatePlaylist,
	isLoading = false,
}: PlaylistListProps) {
	const itemsByPlaylist = playlistItems.reduce<Record<string, PlaylistItem[]>>(
		(acc, item) => {
			if (!item.playlist_id) return acc;
			if (!acc[item.playlist_id]) acc[item.playlist_id] = [];
			acc[item.playlist_id].push(item);
			return acc;
		},
		{},
	);

	const getRecipeName = (screenId: string) => {
		const recipe = recipes.find((r) => r.slug === screenId);
		return recipe?.name || screenId;
	};

	if (playlists.length === 0) {
		return (
			<button
				type="button"
				onClick={onCreatePlaylist}
				className={cn(
					"flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center",
					"transition-colors hover:border-primary hover:bg-primary/5",
				)}
			>
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Film className="h-7 w-7" />
				</div>
				<div>
					<div className="text-base font-semibold">No playlists yet</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Create a reel of screens that rotate on your TRMNL devices.
					</p>
				</div>
				<div className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
					<Plus className="h-4 w-4" />
					Create your first playlist
				</div>
			</button>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
			{playlists.map((playlist) => {
				const items =
					itemsByPlaylist[playlist.id]
						?.slice()
						.sort(
							(a, b) =>
								(a.order_index ?? Number.MAX_SAFE_INTEGER) -
								(b.order_index ?? Number.MAX_SAFE_INTEGER),
						) || [];

				return (
					<PlaylistReelCard
						key={playlist.id}
						playlist={playlist}
						items={items}
						getRecipeName={getRecipeName}
						onEdit={() => onEditPlaylist?.(playlist)}
						onDelete={() => onDeletePlaylist?.(playlist.id)}
						disabled={isLoading}
					/>
				);
			})}
			{onCreatePlaylist && (
				<button
					type="button"
					onClick={onCreatePlaylist}
					className={cn(
						"flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 p-6",
						"transition-colors hover:border-primary hover:bg-primary/5",
					)}
				>
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Plus className="h-6 w-6" />
					</div>
					<div className="text-center">
						<div className="text-sm font-semibold">New playlist</div>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Start a new reel from scratch
						</p>
					</div>
				</button>
			)}
		</div>
	);
}
