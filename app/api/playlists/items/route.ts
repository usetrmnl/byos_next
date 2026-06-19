import { connection, NextResponse } from "next/server";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";

/**
 * GET /api/playlists/items
 * List all playlist items
 */
export async function GET(_request: Request) {
	await connection();

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
		const items = await withUserScope((scopedDb) =>
			scopedDb
				.selectFrom("playlist_items")
				.selectAll()
				.orderBy("playlist_id", "asc")
				.orderBy("order_index", "asc")
				.execute(),
		);

		const playlistItems = items.map((item) => {
			return {
				id: Number.parseInt(item.id, 10),
				playlist_id: item.playlist_id,
				screen_id: item.screen_id,
				duration: item.duration,
				start_time: item.start_time,
				end_time: item.end_time,
				days_of_week: item.days_of_week,
				order_index: item.order_index,
				created_at: item.created_at?.toISOString() || null,
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
