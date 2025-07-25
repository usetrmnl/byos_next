"use server";

import { createClient } from "@/lib/supabase/server";
import type { Playlist, PlaylistItem } from "@/lib/supabase/types";

/**
 * Fetch all playlists with their items
 */
export async function fetchPlaylists(): Promise<Playlist[]> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return [];
    }

    const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching playlists:", error);
        return [];
    }

    return data || [];
}

/**
 * Fetch a single playlist with its items
 */
export async function fetchPlaylistWithItems(playlistId: string): Promise<{
    playlist: Playlist | null;
    items: PlaylistItem[];
}> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { playlist: null, items: [] };
    }

    const [playlistResult, itemsResult] = await Promise.all([
        supabase
            .from("playlists")
            .select("*")
            .eq("id", playlistId)
            .single(),
        supabase
            .from("playlist_items")
            .select("*")
            .eq("playlist_id", playlistId)
            .order("order_index", { ascending: true }),
    ]);

    if (playlistResult.error) {
        console.error("Error fetching playlist:", playlistResult.error);
        return { playlist: null, items: [] };
    }

    if (itemsResult.error) {
        console.error("Error fetching playlist items:", itemsResult.error);
        return { playlist: playlistResult.data, items: [] };
    }

    return {
        playlist: playlistResult.data,
        items: itemsResult.data || [],
    };
}

/**
 * Create a new playlist
 */
export async function createPlaylist(name: string): Promise<{
    success: boolean;
    playlist?: Playlist;
    error?: string;
}> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    const { data, error } = await supabase
        .from("playlists")
        .insert({ name })
        .select()
        .single();

    if (error) {
        console.error("Error creating playlist:", error);
        return { success: false, error: error.message };
    }

    return { success: true, playlist: data };
}

/**
 * Update a playlist
 */
export async function updatePlaylist(
    playlistId: string,
    name: string,
): Promise<{ success: boolean; error?: string }> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    const { error } = await supabase
        .from("playlists")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", playlistId);

    if (error) {
        console.error("Error updating playlist:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Delete a playlist and all its items
 */
export async function deletePlaylist(playlistId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    // Delete playlist (items will be deleted automatically due to CASCADE)
    const { error } = await supabase
        .from("playlists")
        .delete()
        .eq("id", playlistId);

    if (error) {
        console.error("Error deleting playlist:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Create a playlist item
 */
export async function createPlaylistItem(
    playlistId: string,
    item: Omit<PlaylistItem, "id" | "playlist_id" | "created_at">,
): Promise<{ success: boolean; item?: PlaylistItem; error?: string }> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    const { data, error } = await supabase
        .from("playlist_items")
        .insert({
            playlist_id: playlistId,
            screen_id: item.screen_id,
            duration: item.duration,
            start_time: item.start_time,
            end_time: item.end_time,
            days_of_week: item.days_of_week,
            order_index: item.order_index,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating playlist item:", error);
        return { success: false, error: error.message };
    }

    return { success: true, item: data };
}

/**
 * Update a playlist item
 */
export async function updatePlaylistItem(
    itemId: string,
    updates: Partial<Omit<PlaylistItem, "id" | "playlist_id" | "created_at">>,
): Promise<{ success: boolean; error?: string }> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    const { error } = await supabase
        .from("playlist_items")
        .update(updates)
        .eq("id", itemId);

    if (error) {
        console.error("Error updating playlist item:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Delete a playlist item
 */
export async function deletePlaylistItem(itemId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    const { error } = await supabase
        .from("playlist_items")
        .delete()
        .eq("id", itemId);

    if (error) {
        console.error("Error deleting playlist item:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Save a complete playlist with all its items
 */
export async function savePlaylistWithItems(
    playlistData: {
        id?: string;
        name: string;
        items: Array<{
            id?: string;
            screen_id: string;
            duration: number;
            order_index: number;
            start_time?: string;
            end_time?: string;
            days_of_week?: string[];
        }>;
    },
): Promise<{ success: boolean; playlistId?: string; error?: string }> {
    const { supabase } = await createClient();

    if (!supabase) {
        console.warn("Supabase client not initialized");
        return { success: false, error: "Supabase client not initialized" };
    }

    try {
        let playlistId: string;

        // Create or update playlist
        if (playlistData.id) {
            // Update existing playlist
            const { error: playlistError } = await supabase
                .from("playlists")
                .update({
                    name: playlistData.name,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", playlistData.id);

            if (playlistError) {
                throw new Error(`Failed to update playlist: ${playlistError.message}`);
            }

            playlistId = playlistData.id;

            // Delete existing items
            const { error: deleteError } = await supabase
                .from("playlist_items")
                .delete()
                .eq("playlist_id", playlistId);

            if (deleteError) {
                throw new Error(`Failed to delete existing items: ${deleteError.message}`);
            }
        } else {
            // Create new playlist
            const { data: newPlaylist, error: playlistError } = await supabase
                .from("playlists")
                .insert({ name: playlistData.name })
                .select()
                .single();

            if (playlistError) {
                throw new Error(`Failed to create playlist: ${playlistError.message}`);
            }

            playlistId = newPlaylist.id;
        }

        // Insert new items
        if (playlistData.items.length > 0) {
            const itemsToInsert = playlistData.items.map((item) => ({
                playlist_id: playlistId,
                screen_id: item.screen_id,
                duration: item.duration,
                start_time: item.start_time,
                end_time: item.end_time,
                days_of_week: item.days_of_week,
                order_index: item.order_index,
            }));

            const { error: itemsError } = await supabase
                .from("playlist_items")
                .insert(itemsToInsert);

            if (itemsError) {
                throw new Error(`Failed to insert items: ${itemsError.message}`);
            }
        }

        return { success: true, playlistId };
    } catch (error) {
        console.error("Error saving playlist with items:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
} 