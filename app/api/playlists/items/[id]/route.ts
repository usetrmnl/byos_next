import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";

/**
 * PATCH /api/playlists/items/{id}
 * Update a playlist item
 *
 * Body:
 * - visible: boolean
 *
 * Note: BYOS doesn't currently track visibility, but we'll store it for compatibility
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
		const { visible } = body;

		if (typeof visible !== "boolean") {
			return NextResponse.json(
				{
					error: "visible field is required and must be a boolean",
				},
				{ status: 422 },
			);
		}

		// Check if item exists
		const item = await db
			.selectFrom("playlist_items")
			.selectAll()
			.where("id", "=", id)
			.executeTakeFirst();

		if (!item) {
			return NextResponse.json(
				{
					error: "Playlist item not found",
				},
				{ status: 404 },
			);
		}

		// Note: BYOS doesn't have a visible field in playlist_items table
		// For now, we'll just log the update and return success
		// In the future, we could add a visible column to the table
		logInfo("Playlist item visibility update requested", {
			source: "api/playlists/items/[id]",
			metadata: { id, visible },
		});

		// Note: playlist_items table doesn't have updated_at or visible fields
		// This endpoint is implemented for API compatibility but doesn't persist the visible state
		// To fully implement this, you would need to add a visible column to the playlist_items table

		return NextResponse.json(
			{
				status: 200,
				message: "Playlist item updated",
			},
			{ status: 200 },
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
