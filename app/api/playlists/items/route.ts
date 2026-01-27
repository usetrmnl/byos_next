import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";

/**
 * GET /api/playlists/items
 * List all playlist items
 *
 * Note: In TRMNL API, this requires bearer auth, but for BYOS we'll return all items
 * since there's no user authentication system yet.
 */
export async function GET(_request: Request) {
	const { ready } = await checkDbConnection();

	if (!ready) {
		logInfo("Database not available for /api/playlists/items", {
			source: "api/playlists/items",
		});
		return NextResponse.json(
			{
				error: "Database not available",
			},
			{ status: 503 },
		);
	}

	try {
		const items = await db
			.selectFrom("playlist_items")
			.selectAll()
			.orderBy("playlist_id", "asc")
			.orderBy("order_index", "asc")
			.execute();

		// Transform items to match TRMNL API format
		const playlistItems = items.map((item) => {
			return {
				id: Number.parseInt(item.id, 10),
				device_id: null, // BYOS doesn't have device_id in playlist_items
				playlist_group_id: null, // BYOS doesn't have playlist_group_id
				plugin_setting_id: null, // BYOS uses screen_id instead
				mashup_id: null, // BYOS doesn't have mashup_id
				screen_id: item.screen_id,
				visible: true, // BYOS doesn't track visibility, default to true
				mirror: false, // BYOS doesn't track mirror, default to false
				row_order: item.order_index,
				created_at: item.created_at?.toISOString() || null,
				updated_at: item.created_at?.toISOString() || null, // Use created_at as fallback
				rendered_at: null, // BYOS doesn't track rendered_at
				plugin_setting: null, // BYOS doesn't have plugin_setting relationship
			};
		});

		logInfo("Playlist items list request successful", {
			source: "api/playlists/items",
			metadata: { count: playlistItems.length },
		});

		return NextResponse.json(
			{
				data: playlistItems,
			},
			{ status: 200 },
		);
	} catch (error) {
		logError(error as Error, {
			source: "api/playlists/items",
		});
		return NextResponse.json(
			{
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
