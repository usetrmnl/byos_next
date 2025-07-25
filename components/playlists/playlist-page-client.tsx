"use client";

import { useState } from "react";
import { PlaylistList } from "./playlist-list";
import { PlaylistEditor } from "./playlist-editor";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { savePlaylistWithItems, deletePlaylist } from "@/app/actions/playlist";
import { Playlist, PlaylistItem } from "@/lib/supabase/types";
import { toast } from "sonner";

interface PlaylistPageClientProps {
    initialPlaylists: Playlist[];
    initialPlaylistItems: PlaylistItem[];
}

export function PlaylistPageClient({ initialPlaylists, initialPlaylistItems }: PlaylistPageClientProps) {
    const [playlists, setPlaylists] = useState(initialPlaylists);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleCreatePlaylist = () => {
        setEditingPlaylist(null);
        setShowEditor(true);
    };

    const handleEditPlaylist = (playlist: any) => {
        setEditingPlaylist(playlist);
        setShowEditor(true);
    };

    const handleSavePlaylist = async (data: { id?: string; name: string; items: any[] }) => {
        setIsLoading(true);
        try {
            const result = await savePlaylistWithItems(data);

            if (result.success) {
                toast.success(
                    data.id
                        ? "Playlist updated successfully!"
                        : "Playlist created successfully!"
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
                        {editingPlaylist ? "Modify your playlist settings and items." : "Create a new playlist for your TRMNL devices."}
                    </p>
                </div>

                <PlaylistEditor
                    playlist={editingPlaylist}
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
                onEditPlaylist={handleEditPlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                isLoading={isLoading}
            />
        </div>
    );
} 