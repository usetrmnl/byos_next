"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deletePlaylist, savePlaylistWithItems } from "@/app/actions/playlist";
import { Button } from "@/components/ui/button";
import { Playlist, PlaylistItem } from "@/lib/types";
import { PlaylistEditor } from "./playlist-editor";
import { PlaylistList } from "./playlist-list";

interface PlaylistPageClientProps {
	initialPlaylists: Playlist[];
	initialPlaylistItems: PlaylistItem[];
}

export function PlaylistPageClient({
	initialPlaylists,
	initialPlaylistItems,
}: PlaylistPageClientProps) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [playlists, _setPlaylists] = useState(initialPlaylists);
	const [playlistItems] = useState(initialPlaylistItems);
	const [showEditor, setShowEditor] = useState(false);
	const [editingPlaylist, setEditingPlaylist] = useState<
		(Playlist & { items?: PlaylistItem[] }) | null
	>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleCreatePlaylist = () => {
		setEditingPlaylist(null);
		setShowEditor(true);
	};

	const handleEditPlaylist = (playlist: Playlist) => {
		const itemsForPlaylist = playlistItems
			.filter((item) => item.playlist_id === playlist.id)
			.sort(
				(a, b) =>
					(a.order_index ?? Number.MAX_SAFE_INTEGER) -
					(b.order_index ?? Number.MAX_SAFE_INTEGER),
			);

		setEditingPlaylist({
			...playlist,
			items: itemsForPlaylist,
		});
		setShowEditor(true);
	};

	const handleSavePlaylist = async (data: {
		id?: string;
		name: string;
		items: Array<{
			id: string;
			screen_id: string;
			duration: number;
			order_index: number;
			start_time?: string;
			end_time?: string;
			days_of_week?: string[];
		}>;
	}) => {
		setIsLoading(true);
		try {
			const result = await savePlaylistWithItems(data);

			if (result.success) {
				toast.success(
					data.id
						? "Playlist updated successfully!"
						: "Playlist created successfully!",
				);

				// Refresh the page to get updated data
				window.location.reload();
			} else {
				toast.error(result.error || "Failed to save playlist");
			}
		} catch (error) {
			console.error("Error saving playlist:", error);
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeletePlaylist = async (playlistId: string) => {
		if (!confirm("Are you sure you want to delete this playlist?")) {
			return;
		}

		setIsLoading(true);
		try {
			const result = await deletePlaylist(playlistId);

			if (result.success) {
				toast.success("Playlist deleted successfully!");
				// Refresh the page to get updated data
				window.location.reload();
			} else {
				toast.error(result.error || "Failed to delete playlist");
			}
		} catch (error) {
			console.error("Error deleting playlist:", error);
			toast.error("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setShowEditor(false);
		setEditingPlaylist(null);
	};

	if (showEditor) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">
						{editingPlaylist ? "Edit Playlist" : "New Playlist"}
					</h1>
					<p className="text-muted-foreground">
						{editingPlaylist
							? "Modify your playlist settings and items."
							: "Create a new playlist for your TRMNL devices."}
					</p>
				</div>

				<PlaylistEditor
					playlist={
						editingPlaylist
							? {
									id: editingPlaylist.id,
									name: editingPlaylist.name,
									items: editingPlaylist.items?.map((item) => ({
										...item,
										start_time: item.start_time ?? undefined,
										end_time: item.end_time ?? undefined,
										days_of_week: item.days_of_week ?? undefined,
									})),
								}
							: undefined
					}
					onSave={handleSavePlaylist}
					onCancel={handleCancel}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<Button onClick={handleCreatePlaylist} disabled={isLoading}>
					<Plus className="h-4 w-4 mr-2" />
					New Playlist
				</Button>
			</div>

			<PlaylistList
				playlists={playlists}
				playlistItems={playlistItems}
				onEditPlaylist={handleEditPlaylist}
				onDeletePlaylist={handleDeletePlaylist}
				isLoading={isLoading}
			/>
		</div>
	);
}
