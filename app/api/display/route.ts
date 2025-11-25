import crypto from "crypto";
import { NextResponse } from "next/server";
import type { CustomError } from "@/lib/api/types";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";
import type {
	Device,
	PlaylistItem,
	RefreshSchedule,
	TimeRange,
} from "@/lib/types";
import {
	generateApiKey,
	generateFriendlyId,
	getHostUrl,
	timezones,
} from "@/utils/helpers";

const DEFAULT_SCREEN = "album";
const DEFAULT_REFRESH_RATE = 180;

// Helper function to pre-cache the image in the background
const precacheImageInBackground = (
	imageUrl: string,
	friendlyId: string,
): void => {
	// Fire and forget - don't await this
	fetch(imageUrl, { method: "GET" })
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Failed to cache image: ${response.status}`);
			}
			logInfo("Image pre-cached successfully", {
				source: "api/display",
				metadata: { imageUrl, friendlyId },
			});
		})
		.catch((error) => {
			logError("Failed to precache image", {
				source: "api/display",
				metadata: { imageUrl, error, friendlyId },
			});
		});
};

// Helper function to calculate the current refresh rate based on time of day and device settings
const calculateRefreshRate = (
	refreshSchedule: RefreshSchedule | null,
	defaultRefreshRate: number,
	timezone: string = timezones[0].value,
): number => {
	// Use the default refresh rate directly
	if (!refreshSchedule) {
		return defaultRefreshRate;
	}

	// Get current time in device's timezone
	const now = new Date();
	const options = {
		timeZone: timezone,
		hour12: false,
	} as Intl.DateTimeFormatOptions;
	const formatter = new Intl.DateTimeFormat("en-US", {
		...options,
		hour: "2-digit",
		minute: "2-digit",
	});

	// Format: "HH:MM" in 24-hour format
	const [{ value: hour }, , { value: minute }] = formatter.formatToParts(now);
	const currentTimeString = `${hour}:${minute}`;

	// Check if current time falls within any of the defined time ranges
	for (const range of refreshSchedule.time_ranges as TimeRange[]) {
		if (isTimeInRange(currentTimeString, range.start_time, range.end_time)) {
			// Convert refresh rate from seconds to device units (1 unit = 1 second)
			return range.refresh_rate;
		}
	}

	// If no specific range matches, use the default refresh rate from the schedule
	return refreshSchedule.default_refresh_rate;
};

// Helper function to check if a time is within a given range
const isTimeInRange = (
	timeToCheck: string,
	startTime: string,
	endTime: string,
): boolean => {
	// Handle cases where the range crosses midnight
	if (startTime > endTime) {
		return timeToCheck >= startTime || timeToCheck < endTime;
	}

	// Normal case where start time is before end time
	return timeToCheck >= startTime && timeToCheck < endTime;
};

const getActivePlaylistItem = async (
	playlistId: string,
	currentIndex: number,
	timezone: string = "UTC",
): Promise<PlaylistItem | null> => {
	const { ready } = await checkDbConnection();
	if (!ready) return null;

	const items = await db
		.selectFrom("playlist_items")
		.selectAll()
		.where("playlist_id", "=", playlistId)
		.orderBy("order_index", "asc")
		.execute();

	if (!items || items.length === 0) {
		logError(new Error("No items in playlist"), {
			source: "api/display/getActivePlaylistItem",
			metadata: { playlistId },
		});
		return null;
	}

	// Get current time in device's timezone
	const now = new Date();
	const options = {
		timeZone: timezone,
		hour12: false,
	} as Intl.DateTimeFormatOptions;

	// Format time as "HH:MM" in 24-hour format
	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		...options,
		hour: "2-digit",
		minute: "2-digit",
	});
	const [{ value: hour }, , { value: minute }] =
		timeFormatter.formatToParts(now);
	const currentTime = `${hour}:${minute}`;

	// Format day as lowercase full day name to match the playlist item format
	const dayFormatter = new Intl.DateTimeFormat("en-US", {
		...options,
		weekday: "long",
	});
	const currentDay = dayFormatter.format(now).toLowerCase();

	logInfo("Checking playlist items for time/day match", {
		source: "api/display/getActivePlaylistItem",
		metadata: {
			playlistId,
			currentIndex,
			timezone,
			currentTime,
			currentDay,
			totalItems: items.length,
		},
	});

	for (let i = 1; i < items.length + 1; i++) {
		const itemIndex = (currentIndex + i) % items.length;
		const item = items[itemIndex];

		// Parse JSONB fields if necessary (Kysely returns unknown for JSON/JSONB usually, or specific type if defined in interface)
		// Interface says days_of_week: Json | null. We need to cast or check.
		const days_of_week = item.days_of_week as string[] | null;
		const start_time = item.start_time;
		const end_time = item.end_time;

		const isTimeValid =
			!start_time ||
			!end_time ||
			isTimeInRange(currentTime, start_time, end_time);
		const isDayValid =
			!days_of_week ||
			(Array.isArray(days_of_week) && days_of_week.includes(currentDay));

		if (isTimeValid && isDayValid) {
			return item as unknown as PlaylistItem;
		}
	}

	return null;
};

// Helper function to update device status information
const updateDeviceStatus = async ({
	friendlyId,
	refreshDurationSeconds,
	batteryVoltage,
	fwVersion,
	rssi,
	timezone,
}: {
	friendlyId: string;
	refreshDurationSeconds: number;
	batteryVoltage: number;
	fwVersion: string;
	rssi: number;
	timezone?: string;
}): Promise<void> => {
	const now = new Date();
	const nextExpectedUpdate = new Date(
		now.getTime() + refreshDurationSeconds * 1000,
	);
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized, nothing to update");
		logInfo("Database client not initialized, nothing to update", {
			source: "api/display/updateDeviceStatus",
			metadata: {
				friendlyId,
				refreshDurationSeconds,
				timezone: timezone || "Europe/London",
				batteryVoltage,
				fwVersion,
				rssi,
			},
		});
		return;
	}

	try {
		await db
			.updateTable("devices")
			.set({
				last_update_time: now.toISOString(),
				next_expected_update: nextExpectedUpdate.toISOString(),
				last_refresh_duration: Math.round(refreshDurationSeconds),
				battery_voltage: batteryVoltage,
				firmware_version: fwVersion,
				rssi: rssi,
				timezone: timezone || "Europe/London",
			})
			.where("friendly_id", "=", friendlyId)
			.execute();
	} catch (error) {
		logError(error as Error, {
			source: "api/display/updateDeviceStatus",
			metadata: {
				friendlyId,
				refreshDurationSeconds,
				timezone: timezone || "Europe/London",
				batteryVoltage,
				fwVersion,
				rssi,
			},
		});
	}
};

// Function to generate a consistent mock MAC address from an API key
const generateMockMacAddress = (apiKey: string): string => {
	// Create a hash of the API key
	const hash = crypto.createHash("sha256").update(apiKey).digest("hex");

	// Use the last 12 characters of the hash to create a MAC-like string
	// Format: A1:B2:C3:XX:XX:XX where XX is from the hash
	// this ensures it won't clash with real MAC addresses, but repeating request from the same un-setup
	// device will generate the same mock MAC address
	// Convert to uppercase and ensure proper MAC address format
	const macPart = hash.substring(hash.length - 6).toUpperCase();
	return `A1:B2:C3:${macPart.substring(0, 2)}:${macPart.substring(2, 4)}:${macPart.substring(4, 6)}`;
};

export async function GET(request: Request) {
	const apiKey = request.headers.get("Access-Token");
	const macAddress = request.headers.get("ID")?.toUpperCase();
	const refreshRate = request.headers.get("Refresh-Rate");
	const batteryVoltage = request.headers.get("Battery-Voltage");
	const fwVersion = request.headers.get("FW-Version");
	const rssi = request.headers.get("RSSI");
	// log all headers in console for debugging, use entries with iterator and table logger
	console.table(Object.fromEntries(request.headers.entries()));

	const { ready } = await checkDbConnection();

	const baseUrl = `${getHostUrl()}/api/bitmap`;

	const uniqueId =
		Math.random().toString(36).substring(2, 7) +
		Date.now().toString(36).slice(-3);
	// Generate a unique ID for the image filename to stop device from caching the image

	if (!ready) {
		console.warn("Database client not initialized, using noDB mode");
		logInfo(
			"Database client not initialized, using noDB mode with default image",
			{
				source: "api/display",
				metadata: {
					apiKey: apiKey || null,
					macAddress: macAddress || null,
					refreshRate: refreshRate || null,
					batteryVoltage: batteryVoltage || null,
					fwVersion: fwVersion || null,
					rssi: rssi || null,
				},
			},
		);

		// Prefetch the default screen image even when in noDB mode
		const defaultImageUrl = `${baseUrl}/${DEFAULT_SCREEN}.bmp`;
		// precacheImageInBackground(defaultImageUrl, DEFAULT_SCREEN);

		return NextResponse.json(
			{
				status: 0,
				image_url: defaultImageUrl,
				filename: `${DEFAULT_SCREEN}_${uniqueId}.bmp`,
				refresh_rate: DEFAULT_REFRESH_RATE,
				reset_firmware: false,
				update_firmware: false,
				firmware_url: null,
				special_function: "restart_playlist",
			},
			{ status: 200 },
		);
	}

	// Log request details
	logInfo("Display API Request", {
		source: "api/display",
		metadata: {
			url: request.url,
			method: request.method,
			path: new URL(request.url).pathname,
			macAddress: macAddress || null,
			apiKey: apiKey || null,
			refreshRate: refreshRate || null,
			batteryVoltage: batteryVoltage || null,
			fwVersion: fwVersion || null,
			rssi: rssi || null,
		},
	});

	try {
		// First try to find the device by API key
		const deviceByApiKey = await db
			.selectFrom("devices")
			.selectAll()
			.where("api_key", "=", apiKey)
			.executeTakeFirst();

		let device = deviceByApiKey as unknown as Device;

		if (!device) {
			// Device not found with API key
			// Try more forgiving approach similar to log route

			// Initialize device variables
			let deviceFound = false;
			let deviceToUse = null;
			let deviceStatus: "known" | "existing_mock" | "new_mock" = "known";

			// First, try to find the device by MAC address only
			if (macAddress) {
				const deviceByMac = await db
					.selectFrom("devices")
					.selectAll()
					.where("mac_address", "=", macAddress)
					.executeTakeFirst();

				if (deviceByMac) {
					// Device found by MAC address
					deviceFound = true;
					deviceToUse = deviceByMac;
					deviceStatus = "known";

					// If API key is provided and different from the stored one, update it
					if (apiKey && apiKey !== deviceByMac.api_key) {
						try {
							await db
								.updateTable("devices")
								.set({
									api_key: apiKey,
									updated_at: new Date().toISOString(),
								})
								.where("friendly_id", "=", deviceByMac.friendly_id)
								.execute();

							logInfo("Updated API key for device", {
								source: "api/display",
								metadata: {
									device_id: deviceByMac.friendly_id,
								},
							});
						} catch (updateError) {
							logError(new Error("Error updating API key for device"), {
								source: "api/display",
								metadata: {
									device_id: deviceByMac.friendly_id,
									error: updateError,
								},
							});
						}
					}

					logInfo("Device authenticated by MAC address only", {
						source: "api/display",
						metadata: {
							mac_address: macAddress,
							device_id: deviceByMac.friendly_id,
							refresh_rate: refreshRate,
							battery_voltage: batteryVoltage,
							fw_version: fwVersion,
							rssi: rssi,
							device_found: deviceFound,
							device_status: deviceStatus,
						},
					});
				}
			}

			// If not found by MAC address, try API key (redundant but keeping logic structure)
			if (!deviceFound && apiKey) {
				const deviceByApiKeyRetry = await db
					.selectFrom("devices")
					.selectAll()
					.where("api_key", "=", apiKey)
					.executeTakeFirst();

				if (deviceByApiKeyRetry) {
					// Device found by API key
					deviceFound = true;
					deviceToUse = deviceByApiKeyRetry;
					deviceStatus = "known";

					// If MAC address is provided and different from the stored one, update it
					if (macAddress && macAddress !== deviceByApiKeyRetry.mac_address) {
						try {
							await db
								.updateTable("devices")
								.set({
									mac_address: macAddress,
									updated_at: new Date().toISOString(),
								})
								.where("friendly_id", "=", deviceByApiKeyRetry.friendly_id)
								.execute();

							logInfo("Updated MAC address for device", {
								source: "api/display",
								metadata: {
									device_id: deviceByApiKeyRetry.friendly_id,
								},
							});
						} catch (updateError) {
							logError(new Error("Error updating MAC address for device"), {
								source: "api/display",
								metadata: {
									device_id: deviceByApiKeyRetry.friendly_id,
									error: updateError,
								},
							});
						}
					}

					logInfo("Device authenticated by API key only", {
						source: "api/display",
						metadata: {
							api_key: apiKey,
							device_id: deviceByApiKeyRetry.friendly_id,
							refresh_rate: refreshRate,
							battery_voltage: batteryVoltage,
							fw_version: fwVersion,
							rssi: rssi,
							device_found: deviceFound,
							device_status: deviceStatus,
						},
					});
				} else if (macAddress) {
					// API key not found but MAC address provided
					// Create a new device with the provided MAC address and API key
					const friendly_id = generateFriendlyId(
						macAddress,
						new Date().toISOString().replace(/[-:Z]/g, ""),
					);

					try {
						const newDevice = await db
							.insertInto("devices")
							.values({
								mac_address: macAddress,
								name: `TRMNL Device ${friendly_id}`,
								friendly_id: friendly_id,
								api_key: apiKey,
								refresh_schedule: JSON.stringify({
									default_refresh_rate: refreshRate
										? Number.parseInt(refreshRate, 10)
										: 60,
									time_ranges: [],
								}),
								last_update_time: new Date().toISOString(),
								next_expected_update: new Date(
									Date.now() +
									(refreshRate
										? Number.parseInt(refreshRate, 10) * 1000
										: 3600 * 1000),
								).toISOString(),
								timezone: "UTC",
								battery_voltage: batteryVoltage
									? Number.parseFloat(batteryVoltage)
									: null,
								firmware_version: fwVersion || null,
								rssi: rssi ? Number.parseInt(rssi, 10) : null,
								screen: DEFAULT_SCREEN,
							})
							.returningAll()
							.executeTakeFirst();

						if (!newDevice) {
							throw new Error("Failed to create device record");
						}

						deviceFound = true;
						deviceToUse = newDevice;
						deviceStatus = "known";

						logInfo("Created new device with provided MAC address", {
							source: "api/display",
							metadata: {
								mac_address: macAddress,
								api_key: apiKey,
								device_id: newDevice.friendly_id,
								refresh_rate: refreshRate,
								battery_voltage: batteryVoltage,
								fw_version: fwVersion,
								rssi: rssi,
								device_found: deviceFound,
								device_status: deviceStatus,
							},
						});
					} catch (createError) {
						const deviceError: CustomError = new Error(
							"Error creating device with provided MAC address",
						);
						deviceError.originalError = createError;

						logError(deviceError, {
							source: "api/display",
							metadata: {
								mac_address: macAddress,
								api_key: apiKey,
								friendly_id,
							},
						});
					}
				}
			}

			// If device still not found, create a mock device with a generated MAC address
			if (!deviceFound && apiKey) {
				// Generate a mock MAC address from the API key
				const mockMacAddress = generateMockMacAddress(apiKey);

				// Check if we already have a device with this mock MAC address
				const existingMockDevice = await db
					.selectFrom("devices")
					.selectAll()
					.where("mac_address", "=", mockMacAddress)
					.executeTakeFirst();

				if (!existingMockDevice) {
					// No existing mock device, create a new one
					deviceStatus = "new_mock";

					// Create a masked API key from the provided one
					let maskedApiKey = apiKey;
					if (apiKey.length > 8) {
						maskedApiKey = `xxxx${apiKey.substring(apiKey.length - 4)}`;
					}

					// Generate unique IDs for the new device
					const friendly_id = generateFriendlyId(
						mockMacAddress,
						new Date().toISOString().replace(/[-:Z]/g, ""),
					);
					const new_api_key = macAddress
						? apiKey
						: generateApiKey(
							mockMacAddress,
							new Date().toISOString().replace(/[-:Z]/g, ""),
						);

					try {
						const newDevice = await db
							.insertInto("devices")
							.values({
								mac_address: macAddress || mockMacAddress,
								name: `Unknown device with API ${maskedApiKey}`,
								friendly_id: friendly_id,
								api_key: new_api_key,
								refresh_schedule: JSON.stringify({
									default_refresh_rate: refreshRate
										? Number.parseInt(refreshRate, 10)
										: 60,
									time_ranges: [],
								}),
								last_update_time: new Date().toISOString(),
								next_expected_update: new Date(
									Date.now() +
									(refreshRate
										? Number.parseInt(refreshRate, 10) * 1000
										: 3600 * 1000),
								).toISOString(),
								timezone: "UTC",
								battery_voltage: batteryVoltage
									? Number.parseFloat(batteryVoltage)
									: null,
								firmware_version: fwVersion || null,
								rssi: rssi ? Number.parseInt(rssi, 10) : null,
								screen: DEFAULT_SCREEN,
							})
							.returningAll()
							.executeTakeFirst();

						if (!newDevice) {
							throw new Error("Failed to create device for unknown display");
						}

						// Use the newly created device
						deviceFound = true;
						deviceToUse = newDevice;

						logInfo("Created new device for unknown display", {
							source: "api/display",
							metadata: {
								original_api_key: maskedApiKey,
								new_device_id: newDevice.friendly_id,
								mock_mac_address: mockMacAddress,
								refresh_rate: refreshRate,
								battery_voltage: batteryVoltage,
								fw_version: fwVersion,
								rssi: rssi,
								device_found: deviceFound,
								device_status: deviceStatus,
							},
						});
					} catch (createError) {
						// Create an error object with the Supabase error details
						const deviceError: CustomError = new Error(
							"Error creating device for unknown display",
						);
						deviceError.originalError = createError;

						logError(deviceError, {
							source: "api/display",
							metadata: {
								apiKey: maskedApiKey,
								mockMacAddress,
								friendly_id,
								new_api_key,
								device_status: deviceStatus,
							},
						});

						// Prefetch the not-found image even when returning an error
						const notFoundImageUrl = `${baseUrl}/not-found.bmp`;
						// precacheImageInBackground(notFoundImageUrl, "not-found");

						return NextResponse.json(
							{
								status: 500,
								reset_firmware: true,
								message: "Device not found",
								image_url: notFoundImageUrl,
								filename: `not-found_${uniqueId}.bmp`,
							},
							{ status: 200 },
						);
					}
				} else {
					// Use the existing mock device
					deviceFound = true;
					deviceToUse = existingMockDevice;
					deviceStatus = "existing_mock";

					// If real MAC address is provided, update the mock device with the real MAC address
					if (macAddress) {
						try {
							await db
								.updateTable("devices")
								.set({
									mac_address: macAddress,
									updated_at: new Date().toISOString(),
								})
								.where("friendly_id", "=", existingMockDevice.friendly_id)
								.execute();

							logInfo("Updated mock device with real MAC address", {
								source: "api/display",
								metadata: {
									device_id: existingMockDevice.friendly_id,
									mac_address: macAddress,
								},
							});
						} catch (updateMacError) {
							logError(
								new Error("Error updating MAC address for mock device"),
								{
									source: "api/display",
									metadata: {
										device_id: existingMockDevice.friendly_id,
										error: updateMacError,
									},
								},
							);
						}
					}

					logInfo("Using existing mock device for unknown display", {
						source: "api/display",
						metadata: {
							device_id: existingMockDevice.friendly_id,
							mock_mac_address: mockMacAddress,
							refresh_rate: refreshRate,
							battery_voltage: batteryVoltage,
							fw_version: fwVersion,
							rssi: rssi,
							device_found: deviceFound,
							device_status: deviceStatus,
						},
					});
				}
			}

			// If we still don't have a device, return an error
			if (!deviceFound || !deviceToUse) {
				// Create an error object with the Supabase error details
				const deviceError = new Error("Error fetching device");
				// Attach the original error information
				// (deviceError as CustomError).originalError = error;

				logError(deviceError, {
					source: "api/display",
					metadata: { apiKey, macAddress: macAddress || null },
				});

				// Prefetch the not-found image even when returning an error
				const notFoundImageUrl = `${baseUrl}/not-found.bmp`;
				// precacheImageInBackground(notFoundImageUrl, "not-found");

				return NextResponse.json(
					{
						status: 500,
						reset_firmware: true,
						message: "Device not found",
						image_url: notFoundImageUrl,
						filename: `not-found_${uniqueId}.bmp`,
					},
					{ status: 200 },
				);
			}

			// Use the found or created device
			device = deviceToUse as unknown as Device;
		}

		// Update device status information
		const updateData: Partial<Device> = {
			last_update_time: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Add device metrics if available
		if (batteryVoltage) {
			updateData.battery_voltage = Number.parseFloat(batteryVoltage);
		}

		if (fwVersion) {
			updateData.firmware_version = fwVersion;
		}

		if (rssi) {
			updateData.rssi = Number.parseInt(rssi, 10);
		}

		// Update the device in the database
		try {
			await db
				.updateTable("devices")
				.set(updateData)
				.where("id", "=", device.id.toString())
				.execute();
		} catch (updateError) {
			logError(updateError as Error, {
				source: "api/display/updateDeviceStatus",
				metadata: {
					deviceId: device.id,
					batteryVoltage,
					fwVersion,
					rssi,
				},
			});
		}

		logInfo("Device database info", {
			source: "api/display",
			metadata: {
				name: device.name,
				friendly_id: device.friendly_id,
				mac_address: device.mac_address,
				api_key: device.api_key,
				refresh_schedule: device.refresh_schedule,
				last_update_time: device.last_update_time,
				next_expected_update: device.next_expected_update,
				last_refresh_duration: device.last_refresh_duration,
				battery_voltage: device.battery_voltage,
				firmware_version: device.firmware_version,
				rssi: device.rssi,
				screen: device.screen,
				playlist_id: device.playlist_id,
				use_playlist: device.use_playlist,
				current_playlist_index: device.current_playlist_index,
			},
		});

		let screenToDisplay = device.screen;
		let dynamicRefreshRate = 180; // Default refresh rate

		if (device.use_playlist && device.playlist_id) {
			const activeItem = await getActivePlaylistItem(
				device.playlist_id,
				device.current_playlist_index || 0,
				device.timezone || "UTC",
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
				// No active item found - this could happen if all items have time/day restrictions
				// that don't match the current time. In this case, we should keep the current index
				// and use a fallback screen with a reasonable refresh rate.
				logInfo("No active playlist item found, using fallback", {
					source: "api/display",
					metadata: {
						device_id: device.friendly_id,
						current_index: device.current_playlist_index,
						timezone: device.timezone,
					},
				});

				// Use the device's default screen or a fallback
				screenToDisplay = device.screen || "not-found";
				dynamicRefreshRate = 60; // Shorter refresh rate to check again soon
			}
		} else {
			const deviceTimezone = device.timezone || "UTC";
			dynamicRefreshRate = calculateRefreshRate(
				device.refresh_schedule as unknown as RefreshSchedule,
				180,
				deviceTimezone,
			);
		}

		const imageUrl = `${baseUrl}/${screenToDisplay || "not-found"}.bmp`;

		// Start pre-caching the current image in the background
		// This ensures the image is cached by the time the device requests it
		precacheImageInBackground(imageUrl, device.friendly_id);

		// Update device refresh status information in the background
		// We don't await this to avoid delaying the response
		updateDeviceStatus({
			friendlyId: device.friendly_id,
			refreshDurationSeconds: dynamicRefreshRate,
			batteryVoltage: Number.parseFloat(batteryVoltage || "0"),
			fwVersion: fwVersion || "",
			rssi: Number.parseInt(rssi || "0", 10),
			timezone: device.timezone || "UTC",
		});

		// Calculate human-readable next update time for logging
		const nextUpdateTime = new Date(Date.now() + dynamicRefreshRate * 1000);

		logInfo("Display request successful", {
			source: "api/display",
			metadata: {
				device_id: device.friendly_id,
				screen: screenToDisplay,
				refresh_rate: dynamicRefreshRate,
				next_update: nextUpdateTime.toISOString(),
				playlist_mode: device.use_playlist,
				playlist_id: device.playlist_id,
			},
		});

		return NextResponse.json(
			{
				status: 0,
				image_url: imageUrl,
				filename: `${screenToDisplay || "not-found"}_${uniqueId}.bmp`,
				refresh_rate: dynamicRefreshRate,
				reset_firmware: false,
				update_firmware: false,
				firmware_url: null,
				special_function: "restart_playlist",
			},
			{ status: 200 },
		);
	} catch (error) {
		logError(error as Error, {
			source: "api/display",
			metadata: {
				apiKey: apiKey || null,
				macAddress: macAddress || null,
				refreshRate: refreshRate || null,
				batteryVoltage: batteryVoltage || null,
				fwVersion: fwVersion || null,
				rssi: rssi || null,
			},
		});

		// Return error response with not-found image
		const notFoundImageUrl = `${baseUrl}/not-found.bmp`;
		return NextResponse.json(
			{
				status: 500,
				reset_firmware: true,
				message: "Internal server error",
				image_url: notFoundImageUrl,
				filename: `not-found_${uniqueId}.bmp`,
			},
			{ status: 200 },
		);
	}
}
