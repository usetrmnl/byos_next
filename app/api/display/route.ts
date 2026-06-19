import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	DEFAULT_DEVICE_SCREEN,
	DISPLAY_FALLBACK_REFRESH_SECONDS,
	FALLBACK_DEVICE_SCREEN,
	normalizeRefreshSchedule,
} from "@/lib/device/defaults";
import { selectDisplayForDevice } from "@/lib/display/select";
import { getLatestFirmware, isUpdateAvailable } from "@/lib/firmware";
import { logError, logInfo } from "@/lib/logger";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	buildDeviceImageFilename,
	buildDeviceImageUrl,
} from "@/lib/render/device-image-url";
import { getDeviceProfile } from "@/lib/trmnl/device-profile";
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

export const DEFAULT_SCREEN = DEFAULT_DEVICE_SCREEN;
export const DEFAULT_REFRESH_RATE = DISPLAY_FALLBACK_REFRESH_SECONDS;

export async function GET(request: Request) {
	const headers = parseRequestHeaders(request);

	if (!headers.apiKey) {
		return NextResponse.json(
			{ status: 401, error: "Access-Token header is required" },
			{ status: 401 },
		);
	}

	const { ready } = await checkDbConnection();
	const baseUrl = `${headers.hostUrl}/api/bitmap`;
	const uniqueId =
		Math.random().toString(36).substring(2, 7) +
		Date.now().toString(36).slice(-3);

	if (!ready) {
		logInfo("Database not available, falling back to default screen", {
			source: "api/display",
		});
		const profile = await getDeviceProfile(headers.model);
		const width = headers.width || profile.model.width;
		const height = headers.height || profile.model.height;
		const noDbParams = new URLSearchParams({
			width: String(width),
			height: String(height),
			grayscale: "2",
		});
		if (profile.model.name) noDbParams.set("model", profile.model.name);
		if (profile.palette?.id) noDbParams.set("palette_id", profile.palette.id);
		if (headers.base64) noDbParams.set("base64", "true");
		const noDbQueryParams = noDbParams.toString();

		return buildDisplayResponse(
			buildDeviceImageUrl({
				baseUrl,
				imagePath: DEFAULT_SCREEN,
				profile,
				query: noDbQueryParams,
			}),
			buildDeviceImageFilename(DEFAULT_SCREEN, uniqueId, profile),
			DEFAULT_REFRESH_RATE,
		);
	}

	logInfo("Display API Request", {
		source: "api/display",
		metadata: { apiKey: headers.apiKey?.slice(0, 6) },
	});

	try {
		const device = await findOrCreateDevice(headers);

		if (!device) {
			logError("Error fetching/creating device", {
				source: "api/display",
				metadata: { apiKey: headers.apiKey?.slice(0, 6) },
			});
			return buildErrorResponse("Device not found", baseUrl, uniqueId);
		}

		const selection = await selectDisplayForDevice(device, {
			hostUrl: headers.hostUrl,
			width: headers.width,
			height: headers.height,
			base64: headers.base64,
		});

		let { screen: screenToDisplay, imageUrl } = selection;
		let dynamicRefreshRate: number;

		switch (device.display_mode) {
			case DeviceDisplayMode.PLAYLIST: {
				if (device.playlist_id) {
					const activeItem = await getActivePlaylistItem(
						device.playlist_id,
						device.current_playlist_index || 0,
						device.timezone || "UTC",
						device.user_id,
					);

					if (activeItem) {
						screenToDisplay = activeItem.screen_id;
						dynamicRefreshRate = activeItem.duration;
						await db
							.updateTable("devices")
							.set({ current_playlist_index: activeItem.order_index })
							.where("id", "=", device.id.toString())
							.execute();
					} else {
						logInfo("No active playlist item found, using fallback", {
							source: "api/display",
							metadata: { deviceId: device.friendly_id },
						});
						screenToDisplay = device.screen || FALLBACK_DEVICE_SCREEN;
						dynamicRefreshRate = DEFAULT_REFRESH_RATE;
					}
				} else {
					dynamicRefreshRate = 180;
				}
				imageUrl = buildDeviceImageUrl({
					baseUrl,
					imagePath: screenToDisplay,
					profile: selection.profile,
					query: selection.baseQueryParams,
				});
				break;
			}

			case DeviceDisplayMode.MIXUP:
				if (device.mixup_id) {
					imageUrl = buildDeviceImageUrl({
						baseUrl,
						imagePath: `mixup/${device.mixup_id}`,
						profile: selection.profile,
						query: `${selection.baseQueryParams}&access_token=${encodeURIComponent(
							headers.apiKey,
						)}`,
					});
					logInfo("Using mixup display mode", {
						source: "api/display",
						metadata: {
							deviceId: device.friendly_id,
							mixupId: device.mixup_id,
						},
					});
				}
				dynamicRefreshRate = calculateRefreshRate(
					normalizeRefreshSchedule(device.refresh_schedule),
					DEFAULT_REFRESH_RATE,
					device.timezone || "UTC",
				);
				break;

			default:
				dynamicRefreshRate = calculateRefreshRate(
					normalizeRefreshSchedule(device.refresh_schedule),
					DEFAULT_REFRESH_RATE,
					device.timezone || "UTC",
				);
				break;
		}

		precacheImageInBackground(imageUrl, device.friendly_id);
		updateDeviceStatus(device, headers, dynamicRefreshRate);

		logInfo("Display request successful", {
			source: "api/display",
			metadata: {
				deviceId: device.friendly_id,
				screen: screenToDisplay,
				refreshRate: dynamicRefreshRate,
				displayMode: device.display_mode,
			},
		});

		const orientation = device.screen_orientation || "landscape";
		const firmwareExtra: Record<string, unknown> = {
			// 0 = portrait (no rotation), 1 = landscape (90° rotation).
			image_rotate: orientation === "landscape" ? 1 : 0,
			// Display tuning profile. Firmware reads this only when it sent
			// `temperature-profile: true` in the request.
			temperature_profile: device.temperature_profile ?? "default",
		};

		const latestFirmware = await getLatestFirmware();
		if (
			latestFirmware &&
			isUpdateAvailable(device.firmware_version, latestFirmware.version)
		) {
			firmwareExtra.update_firmware = true;
			firmwareExtra.firmware_url = latestFirmware.downloadUrl;
			logInfo("Firmware update available", {
				source: "api/display",
				metadata: {
					deviceId: device.friendly_id,
					currentVersion: device.firmware_version,
					latestVersion: latestFirmware.version,
				},
			});
		}

		return buildDisplayResponse(
			imageUrl,
			buildDeviceImageFilename(screenToDisplay, uniqueId, selection.profile),
			dynamicRefreshRate,
			firmwareExtra,
		);
	} catch (_error) {
		logError("Internal server error", {
			source: "api/display",
		});
		return buildErrorResponse("Internal server error", baseUrl, uniqueId);
	}
}
