import { NextResponse } from "next/server";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";

/**
 * PATCH /api/playlists/items/{id}
 * Update a playlist item
 *
 * Body:
 * - visible: boolean
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { ready } = await checkDbConnection();

	if (!ready) {
		logInfo("Database not available for /api/playlists/items/{id}", {
			source: "api/playlists/items/[id]",
			metadata: { id },
		});
		return NextResponse.json(
			{
				error: "Database not available",
			},
			{ status: 503 },
		);
	}

	try {
		const body = await request.json();
		if ("visible" in body) {
			return NextResponse.json(
				{
					error: "Playlist item visibility is not supported",
				},
				{ status: 501 },
			);
		}

		// Check if item exists
		const item = await withUserScope((scopedDb) =>
			scopedDb
				.selectFrom("playlist_items")
				.selectAll()
				.where("id", "=", id)
				.executeTakeFirst(),
		);

		if (!item) {
			return NextResponse.json(
				{
					error: "Playlist item not found",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{ error: "No supported fields to update" },
			{ status: 400 },
		);
	} catch (error) {
		logError(error as Error, {
			source: "api/playlists/items/[id]",
			metadata: { id },
		});
		return NextResponse.json(
			{
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
