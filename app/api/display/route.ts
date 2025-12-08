import { checkDbConnection } from "@/lib/database/utils";
import { db } from "@/lib/database/db";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import type { RefreshSchedule } from "@/lib/types";
import { logError, logInfo } from "@/lib/logger";
import {
	buildDisplayResponse,
	buildErrorResponse,
	calculateRefreshRate,
	findOrCreateDevice,
	getActivePlaylistItem,
	parseRequestHeaders,
	precacheImageInBackground,
	updateDeviceStatus,
} from "./utils";

export const DEFAULT_SCREEN = "album";
export const DEFAULT_REFRESH_RATE = 180;

export async function GET(request: Request) {
	const headers = parseRequestHeaders(request);

	// log all headers in console for debugging
	console.table(headers);

	const { ready } = await checkDbConnection();
	const baseUrl = `${headers.hostUrl}/api/bitmap`;
	const uniqueId = Math.random().toString(36).substring(2, 7) + Date.now().toString(36).slice(-3);

	if (!ready) {
		console.warn("Database client not initialized, using noDB mode");
		logInfo("Database client not initialized, using noDB mode", { source: "api/display", metadata: { headers } });
		return buildDisplayResponse(
			`${baseUrl}/${DEFAULT_SCREEN}.bmp`,
			`${DEFAULT_SCREEN}_${uniqueId}.bmp`,
			DEFAULT_REFRESH_RATE
		);
	}

	logInfo("Display API Request", { source: "api/display", metadata: { headers } });

	try {
		const device = await findOrCreateDevice(headers);

		if (!device) {
			logError("Error fetching/creating device", { source: "api/display", metadata: { headers } });
			return buildErrorResponse("Device not found", baseUrl, uniqueId);
		}

		let screenToDisplay = device.screen;
		let dynamicRefreshRate = 180;
		let imageUrl: string;

		switch (device.display_mode) {
			case DeviceDisplayMode.PLAYLIST:
				if (device.playlist_id) {
					const activeItem = await getActivePlaylistItem(
						device.playlist_id,
						device.current_playlist_index || 0,
						device.timezone || "UTC",
					);

					if (activeItem) {
						screenToDisplay = activeItem.screen_id;
						dynamicRefreshRate = activeItem.duration;
						// Update playlist index
						await db.updateTable("devices")
							.set({ current_playlist_index: activeItem.order_index })
							.where("id", "=", device.id.toString())
							.execute();
					} else {
						logInfo("No active playlist item found, using fallback", { source: "api/display", metadata: { deviceId: device.friendly_id } });
						screenToDisplay = device.screen || "not-found";
						dynamicRefreshRate = 60;
					}
				}
				imageUrl = `${baseUrl}/${screenToDisplay || "not-found"}.bmp`;
				break;

			case DeviceDisplayMode.MIXUP:
				if (device.mixup_id) {
					imageUrl = `${baseUrl}/mixup/${device.mixup_id}.bmp`;
					const metadata = { deviceId: device.friendly_id, mixupId: device.mixup_id };
					logInfo("Using mixup display mode", { source: "api/display", metadata });
				} else {
					imageUrl = `${baseUrl}/${screenToDisplay || "not-found"}.bmp`;
				}
				dynamicRefreshRate = calculateRefreshRate(
					device.refresh_schedule as unknown as RefreshSchedule,
					180,
					device.timezone || "UTC"
				);
				break;

			default:
				dynamicRefreshRate = calculateRefreshRate(
					device.refresh_schedule as unknown as RefreshSchedule,
					180,
					device.timezone || "UTC"
				);
				imageUrl = `${baseUrl}/${screenToDisplay || "not-found"}.bmp`;
				break;
		}

		precacheImageInBackground(imageUrl, device.friendly_id);

		// Update device status in background
		updateDeviceStatus(device, headers, dynamicRefreshRate);
		const metadata = { deviceId: device.friendly_id, screen: screenToDisplay, refreshRate: dynamicRefreshRate, displayMode: device.display_mode };
		logInfo("Display request successful", { source: "api/display", metadata });

		return buildDisplayResponse(
			imageUrl,
			`${screenToDisplay || "not-found"}_${uniqueId}.bmp`,
			dynamicRefreshRate
		);

	} catch (error) {
		logError("Internal server error", { source: "api/display", metadata: { headers } });
		return buildErrorResponse("Internal server error", baseUrl, uniqueId);
	}
}
