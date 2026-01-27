"use server";

import { getCurrentUserId } from "@/lib/auth/get-user";
import { db } from "@/lib/database/db";
import {
	withUserScope,
	withUserScopeTransaction,
} from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import type { Playlist, PlaylistItem } from "@/lib/types";

/**
 * Fetch all playlists with their items
 */
export async function fetchPlaylists(): Promise<Playlist[]> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return [];
	}

	const playlists = await withUserScope((scopedDb) =>
		scopedDb
			.selectFrom("playlists")
			.selectAll()
			.orderBy("created_at", "desc")
			.execute(),
	);

	return playlists as unknown as Playlist[];
}

/**
 * Fetch a single playlist with its items
 */
export async function fetchPlaylistWithItems(playlistId: string): Promise<{
	playlist: Playlist | null;
	items: PlaylistItem[];
}> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { playlist: null, items: [] };
	}

	const [playlist, items] = await withUserScope((scopedDb) =>
		Promise.all([
			scopedDb
				.selectFrom("playlists")
				.selectAll()
				.where("id", "=", playlistId)
				.executeTakeFirst(),
			scopedDb
				.selectFrom("playlist_items")
				.selectAll()
				.where("playlist_id", "=", playlistId)
				.orderBy("order_index", "asc")
				.execute(),
		]),
	);

	if (!playlist) {
		return { playlist: null, items: [] };
	}

	return {
		playlist: playlist as unknown as Playlist,
		items: items as unknown as PlaylistItem[],
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
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	const userId = await getCurrentUserId();

	try {
		const playlist = await db
			.insertInto("playlists")
			.values({ name, user_id: userId })
			.returningAll()
			.executeTakeFirst();

		return { success: true, playlist: playlist as unknown as Playlist };
	} catch (error) {
		console.error("Error creating playlist:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Update a playlist
 */
export async function updatePlaylist(
	playlistId: string,
	name: string,
): Promise<{ success: boolean; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		await withUserScope((scopedDb) =>
			scopedDb
				.updateTable("playlists")
				.set({ name, updated_at: new Date().toISOString() })
				.where("id", "=", playlistId)
				.execute(),
		);

		return { success: true };
	} catch (error) {
		console.error("Error updating playlist:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Delete a playlist and all its items
 */
export async function deletePlaylist(playlistId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		await withUserScope((scopedDb) =>
			scopedDb.deleteFrom("playlists").where("id", "=", playlistId).execute(),
		);

		return { success: true };
	} catch (error) {
		console.error("Error deleting playlist:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Create a playlist item
 */
export async function createPlaylistItem(
	playlistId: string,
	item: Omit<PlaylistItem, "id" | "playlist_id" | "created_at">,
): Promise<{ success: boolean; item?: PlaylistItem; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		const newItem = await db
			.insertInto("playlist_items")
			.values({
				playlist_id: playlistId,
				screen_id: item.screen_id,
				duration: item.duration,
				start_time: item.start_time,
				end_time: item.end_time,
				days_of_week: item.days_of_week
					? JSON.stringify(item.days_of_week)
					: null,
				order_index: item.order_index,
			})
			.returningAll()
			.executeTakeFirst();

		return { success: true, item: newItem as unknown as PlaylistItem };
	} catch (error) {
		console.error("Error creating playlist item:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Update a playlist item
 */
export async function updatePlaylistItem(
	itemId: string,
	updates: Partial<Omit<PlaylistItem, "id" | "playlist_id" | "created_at">>,
): Promise<{ success: boolean; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		const updateData: Record<string, unknown> = { ...updates };
		if (updates.days_of_week) {
			updateData.days_of_week = JSON.stringify(updates.days_of_week);
		}

		await db
			.updateTable("playlist_items")
			.set(updateData)
			.where("id", "=", itemId)
			.execute();

		return { success: true };
	} catch (error) {
		console.error("Error updating playlist item:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Delete a playlist item
 */
export async function deletePlaylistItem(itemId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		await db.deleteFrom("playlist_items").where("id", "=", itemId).execute();

		return { success: true };
	} catch (error) {
		console.error("Error deleting playlist item:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Save a complete playlist with all its items
 */
export async function savePlaylistWithItems(playlistData: {
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
}): Promise<{ success: boolean; playlistId?: string; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	const userId = await getCurrentUserId();

	try {
		return await withUserScopeTransaction(async (trx) => {
			let playlistId: string;

			// Create or update playlist
			if (playlistData.id) {
				// Update existing playlist (RLS handles user check)
				await trx
					.updateTable("playlists")
					.set({
						name: playlistData.name,
						updated_at: new Date().toISOString(),
					})
					.where("id", "=", playlistData.id)
					.execute();

				playlistId = playlistData.id;

				// Delete existing items
				await trx
					.deleteFrom("playlist_items")
					.where("playlist_id", "=", playlistId)
					.execute();
			} else {
				// Create new playlist (include user_id for new records)
				const newPlaylist = await trx
					.insertInto("playlists")
					.values({ name: playlistData.name, user_id: userId })
					.returning("id")
					.executeTakeFirstOrThrow();

				playlistId = newPlaylist.id;
			}

			// Insert new items
			if (playlistData.items.length > 0) {
				const itemsToInsert = playlistData.items.map((item) => ({
					playlist_id: playlistId,
					screen_id: item.screen_id,
					duration: item.duration,
					start_time: item.start_time || null,
					end_time: item.end_time || null,
					days_of_week: item.days_of_week
						? JSON.stringify(item.days_of_week)
						: null,
					order_index: item.order_index,
				}));

				await trx.insertInto("playlist_items").values(itemsToInsert).execute();
			}

			return { success: true, playlistId };
		});
	} catch (error) {
		console.error("Error saving playlist with items:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
