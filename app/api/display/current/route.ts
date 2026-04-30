import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { selectDisplayForDevice } from "@/lib/display/select";
import { logError, logInfo } from "@/lib/logger";
import { buildDeviceImageFilename } from "@/lib/render/device-image-url";
import type { Device } from "@/lib/types";
import { parseRequestHeaders } from "../utils";

/**
 * GET /api/display/current
 * Fetch the current screen for a device.
 *
 * Headers:
 * - Access-Token (required): Device API Key
 */
export async function GET(request: Request) {
	const headers = parseRequestHeaders(request);
	const { apiKey } = headers;

	if (!apiKey) {
		return NextResponse.json(
			{ status: 401, error: "Access-Token header is required" },
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
			{ status: 503, error: "Database not available" },
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
				{ status: 404, error: "Device not found" },
				{ status: 404 },
			);
		}

		const deviceData = device as unknown as Device;
		const selection = await selectDisplayForDevice(deviceData, {
			hostUrl: headers.hostUrl,
			width: headers.width,
			height: headers.height,
		});

		const refreshSchedule = deviceData.refresh_schedule as {
			default_refresh_rate: number;
		} | null;
		const refreshRate = refreshSchedule?.default_refresh_rate || 180;

		logInfo("Current display request successful", {
			source: "api/display/current",
			metadata: {
				deviceId: deviceData.friendly_id,
				screen: selection.screen,
			},
		});

		return NextResponse.json(
			{
				status: 200,
				refresh_rate: refreshRate,
				image_url: selection.imageUrl,
				filename: buildDeviceImageFilename(
					selection.screen,
					"current",
					selection.profile,
				),
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
			{ status: 500, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
