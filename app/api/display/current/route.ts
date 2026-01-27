import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/recipe-renderer";
import type { Device } from "@/lib/types";
import { parseRequestHeaders } from "../utils";

/**
 * GET /api/display/current
 * Fetch the current screen for a device
 *
 * Headers:
 * - Access-Token (required): Device API Key
 */
export async function GET(request: Request) {
	const headers = parseRequestHeaders(request);
	const { apiKey } = headers;

	if (!apiKey) {
		return NextResponse.json(
			{
				status: 401,
				error: "Access-Token header is required",
			},
			{ status: 401 },
		);
	}

	const { ready } = await checkDbConnection();
	if (!ready) {
		logInfo("Database not available for /api/display/current", {
			source: "api/display/current",
			metadata: { apiKey },
		});
		return NextResponse.json(
			{
				status: 503,
				error: "Database not available",
			},
			{ status: 503 },
		);
	}

	try {
		const device = await db
			.selectFrom("devices")
			.selectAll()
			.where("api_key", "=", apiKey)
			.executeTakeFirst();

		if (!device) {
			return NextResponse.json(
				{
					status: 404,
					error: "Device not found",
				},
				{ status: 404 },
			);
		}

		const deviceData = device as unknown as Device;
		const baseUrl = `${headers.hostUrl}/api/bitmap`;
		const screenToDisplay = deviceData.screen || "not-found";
		const orientation = deviceData.screen_orientation || "landscape";
		const deviceWidth =
			orientation === "landscape"
				? deviceData.screen_width || DEFAULT_IMAGE_WIDTH
				: deviceData.screen_height || DEFAULT_IMAGE_HEIGHT;
		const deviceHeight =
			orientation === "landscape"
				? deviceData.screen_height || DEFAULT_IMAGE_HEIGHT
				: deviceData.screen_width || DEFAULT_IMAGE_WIDTH;

		// Get grayscale levels (default to 2 if not set)
		const grayscaleLevels =
			deviceData.grayscale === 2 ||
			deviceData.grayscale === 4 ||
			deviceData.grayscale === 16
				? deviceData.grayscale
				: 2;

		const imageUrl = `${baseUrl}/${screenToDisplay}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${grayscaleLevels}`;

		// Calculate refresh rate from schedule or use default
		const refreshSchedule = deviceData.refresh_schedule as {
			default_refresh_rate: number;
		} | null;
		const refreshRate = refreshSchedule?.default_refresh_rate || 180;

		logInfo("Current display request successful", {
			source: "api/display/current",
			metadata: {
				deviceId: deviceData.friendly_id,
				screen: screenToDisplay,
			},
		});

		return NextResponse.json(
			{
				status: 200,
				refresh_rate: refreshRate,
				image_url: imageUrl,
				filename: `${screenToDisplay}.bmp`,
				rendered_at: deviceData.last_update_time || new Date().toISOString(),
			},
			{ status: 200 },
		);
	} catch (error) {
		logError(error as Error, {
			source: "api/display/current",
			metadata: { apiKey },
		});
		return NextResponse.json(
			{
				status: 500,
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
