import crypto from "crypto";
import { NextResponse } from "next/server";
import type { CustomError } from "@/lib/api/types";
import { logError, logInfo } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey, generateFriendlyId } from "@/utils/helpers";

interface LogEntry {
	creation_timestamp: number;
	message?: string;
	level?: string;
	device_status?: string;
	battery_voltage?: number;
	rssi?: number;
	firmware_version?: string;
}

interface LogData {
	logs_array: LogEntry[];
	device_id?: string;
	timestamp?: string;
}

// Define a type for the expected request body
interface LogRequestBody {
	log: {
		logs_array: LogEntry[];
	};
}

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
	logInfo("Log API GET Request received (unexpected)", {
		source: "api/log",
		metadata: {
			url: request.url,
			method: request.method,
			path: new URL(request.url).pathname,
			search: new URL(request.url).search,
			origin: new URL(request.url).origin,
		},
	});

	// Simply return 404 for GET requests
	return NextResponse.json(
		{
			status: 404,
			message: "Not found",
		},
		{ status: 404 },
	);
}

export async function POST(request: Request) {
	// Log request details
	logInfo("Log API Request", {
		source: "api/log",
		metadata: {
			url: request.url,
			method: request.method,
			path: new URL(request.url).pathname,
			search: new URL(request.url).search,
			origin: new URL(request.url).origin,
		},
	});

	try {
		const macAddress = request.headers.get("ID")?.toUpperCase();
		const apiKey = request.headers.get("Access-Token");
		const refreshRate = request.headers.get("Refresh-Rate");
		const batteryVoltage = request.headers.get("Battery-Voltage");
		const fwVersion = request.headers.get("FW-Version");
		const rssi = request.headers.get("RSSI");
		const { supabase } = await createClient();

		if (!supabase) {
			console.warn(
				"Supabase client not initialized, using noDB mode, skipping log processing",
			);
			logInfo(
				"Supabase client not initialized, using noDB mode, skipping log processing",
				{
					source: "api/log",
					metadata: {
						macAddress,
						apiKey,
						refreshRate,
						batteryVoltage,
						fwVersion,
						rssi,
					},
				},
			);
			return NextResponse.json(
				{
					status: 200,
					message: "Log received",
				},
				{ status: 200 },
			);
		}

		// Initialize device variables
		let deviceId = "";
		let deviceFound = false;
		let deviceStatus: "known" | "existing_mock" | "new_mock" = "known";

		// First, try to find the device by MAC address if provided
		if (macAddress) {
			const { data: deviceByMac, error: macError } = await supabase
				.from("devices")
				.select("*")
				.eq("mac_address", macAddress)
				.single();

			if (!macError && deviceByMac) {
				// Device found by MAC address
				deviceId = deviceByMac.friendly_id;
				deviceFound = true;
				deviceStatus = "known";

				// If API key is provided and different from the stored one, update it
				if (apiKey && apiKey !== deviceByMac.api_key) {
					const { error: updateError } = await supabase
						.from("devices")
						.update({
							api_key: apiKey,
							updated_at: new Date().toISOString(),
						})
						.eq("friendly_id", deviceId);

					if (updateError) {
						logError(new Error("Error updating API key for device"), {
							source: "api/log",
							metadata: {
								device_id: deviceId,
								error: updateError,
							},
						});
					} else {
						logInfo("Updated API key for device", {
							source: "api/log",
							metadata: {
								device_id: deviceId,
							},
						});
					}
				}

				// Update device metrics
				const { error: updateError } = await supabase
					.from("devices")
					.update({
						last_update_time: new Date().toISOString(),
						next_expected_update: new Date(
							Date.now() +
								(refreshRate
									? Number.parseInt(refreshRate, 10) * 1000
									: 3600 * 1000),
						).toISOString(),
						battery_voltage: batteryVoltage
							? Number.parseFloat(batteryVoltage)
							: deviceByMac.battery_voltage,
						firmware_version: fwVersion || deviceByMac.firmware_version,
						rssi: rssi ? Number.parseInt(rssi, 10) : deviceByMac.rssi,
						updated_at: new Date().toISOString(),
					})
					.eq("friendly_id", deviceId);

				if (updateError) {
					logError(new Error("Error updating device metrics"), {
						source: "api/log",
						metadata: {
							device_id: deviceId,
							error: updateError,
						},
					});
				}

				logInfo("Device authenticated by MAC address", {
					source: "api/log",
					metadata: {
						mac_address: macAddress,
						device_id: deviceId,
						refresh_rate: refreshRate,
						battery_voltage: batteryVoltage,
						fw_version: fwVersion,
						rssi: rssi,
						device_found: deviceFound,
						device_status: deviceStatus,
					},
				});
			} else if (apiKey) {
				// MAC address not found but API key provided
				// First check if the API key exists in the database
				const { data: deviceByApiKey, error: apiKeyError } = await supabase
					.from("devices")
					.select("*")
					.eq("api_key", apiKey)
					.single();

				if (!apiKeyError && deviceByApiKey) {
					// Device found by API key, update its MAC address
					const { error: updateError } = await supabase
						.from("devices")
						.update({
							mac_address: macAddress,
							updated_at: new Date().toISOString(),
						})
						.eq("friendly_id", deviceByApiKey.friendly_id);

					if (updateError) {
						logError(new Error("Error updating MAC address for device"), {
							source: "api/log",
							metadata: {
								device_id: deviceByApiKey.friendly_id,
								mac_address: macAddress,
								api_key: apiKey,
								error: updateError,
							},
						});
					} else {
						logInfo("Updated device with real MAC address", {
							source: "api/log",
							metadata: {
								device_id: deviceByApiKey.friendly_id,
								mac_address: macAddress,
								api_key: apiKey,
							},
						});
					}

					// Use the existing device
					deviceId = deviceByApiKey.friendly_id;
					deviceFound = true;
					deviceStatus = "known";

					// Update device metrics
					const { error: metricsUpdateError } = await supabase
						.from("devices")
						.update({
							last_update_time: new Date().toISOString(),
							next_expected_update: new Date(
								Date.now() +
									(refreshRate
										? Number.parseInt(refreshRate, 10) * 1000
										: 3600 * 1000),
							).toISOString(),
							battery_voltage: batteryVoltage
								? Number.parseFloat(batteryVoltage)
								: deviceByApiKey.battery_voltage,
							firmware_version: fwVersion || deviceByApiKey.firmware_version,
							rssi: rssi ? Number.parseInt(rssi, 10) : deviceByApiKey.rssi,
							updated_at: new Date().toISOString(),
						})
						.eq("friendly_id", deviceId);

					if (metricsUpdateError) {
						logError(new Error("Error updating device metrics"), {
							source: "api/log",
							metadata: {
								device_id: deviceId,
								error: metricsUpdateError,
							},
						});
					}

					logInfo(
						"Device authenticated by API key and updated with MAC address",
						{
							source: "api/log",
							metadata: {
								mac_address: macAddress,
								api_key: apiKey,
								device_id: deviceId,
								refresh_rate: refreshRate,
								battery_voltage: batteryVoltage,
								fw_version: fwVersion,
								rssi: rssi,
								device_found: deviceFound,
								device_status: deviceStatus,
							},
						},
					);
				} else {
					// API key not found, create a new device with the provided MAC address and API key
					const friendly_id = generateFriendlyId(
						macAddress,
						new Date().toISOString().replace(/[-:Z]/g, ""),
					);

					const { data: newDevice, error: createError } = await supabase
						.from("devices")
						.insert({
							mac_address: macAddress,
							name: `TRMNL Device ${friendly_id}`,
							friendly_id: friendly_id,
							api_key: apiKey,
							refresh_schedule: {
								default_refresh_rate: refreshRate
									? Number.parseInt(refreshRate, 10)
									: 60,
								time_ranges: [],
							},
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
						})
						.select()
						.single();

					if (createError || !newDevice) {
						const deviceError: CustomError = new Error(
							"Error creating device with provided MAC address",
						);
						deviceError.originalError = createError;

						logError(deviceError, {
							source: "api/log",
							metadata: {
								mac_address: macAddress,
								api_key: apiKey,
								friendly_id,
							},
						});

						// Fall back to API key lookup
						deviceFound = false;
					} else {
						deviceId = newDevice.friendly_id;
						deviceFound = true;
						deviceStatus = "known";

						logInfo("Created new device with provided MAC address", {
							source: "api/log",
							metadata: {
								mac_address: macAddress,
								api_key: apiKey,
								device_id: deviceId,
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
			}
		}

		// If device not found by MAC address, try API key
		if (!deviceFound && apiKey) {
			const { data: device, error } = await supabase
				.from("devices")
				.select("*")
				.eq("api_key", apiKey)
				.single();

			if (error || !device) {
				// Device not found by API key, first check if this API key exists elsewhere
				// This could happen if the device was registered with a different MAC address
				const { data: existingDeviceWithApiKey, error: apiKeyLookupError } =
					await supabase
						.from("devices")
						.select("*")
						.eq("api_key", apiKey)
						.single();

				if (!apiKeyLookupError && existingDeviceWithApiKey) {
					// Device found with this API key but different MAC address
					deviceId = existingDeviceWithApiKey.friendly_id;
					deviceFound = true;
					deviceStatus = "known";

					// If MAC address is provided, update the device with the real MAC address
					if (
						macAddress &&
						macAddress !== existingDeviceWithApiKey.mac_address
					) {
						const { error: updateMacError } = await supabase
							.from("devices")
							.update({
								mac_address: macAddress,
								updated_at: new Date().toISOString(),
							})
							.eq("friendly_id", deviceId);

						if (updateMacError) {
							logError(new Error("Error updating MAC address for device"), {
								source: "api/log",
								metadata: {
									device_id: deviceId,
									mac_address: macAddress,
									error: updateMacError,
								},
							});
						} else {
							logInfo("Updated device with MAC address", {
								source: "api/log",
								metadata: {
									device_id: deviceId,
									mac_address: macAddress,
								},
							});
						}
					}

					// Update device metrics
					const { error: updateError } = await supabase
						.from("devices")
						.update({
							last_update_time: new Date().toISOString(),
							next_expected_update: new Date(
								Date.now() +
									(refreshRate
										? Number.parseInt(refreshRate, 10) * 1000
										: 3600 * 1000),
							).toISOString(),
							battery_voltage: batteryVoltage
								? Number.parseFloat(batteryVoltage)
								: existingDeviceWithApiKey.battery_voltage,
							firmware_version:
								fwVersion || existingDeviceWithApiKey.firmware_version,
							rssi: rssi
								? Number.parseInt(rssi, 10)
								: existingDeviceWithApiKey.rssi,
							updated_at: new Date().toISOString(),
						})
						.eq("friendly_id", deviceId);

					if (updateError) {
						logError(new Error("Error updating device metrics"), {
							source: "api/log",
							metadata: {
								device_id: deviceId,
								error: updateError,
							},
						});
					}

					logInfo("Device authenticated by API key (different MAC)", {
						source: "api/log",
						metadata: {
							api_key: apiKey,
							device_id: deviceId,
							mac_address: macAddress,
							refresh_rate: refreshRate,
							battery_voltage: batteryVoltage,
							fw_version: fwVersion,
							rssi: rssi,
							device_found: deviceFound,
							device_status: deviceStatus,
						},
					});
				} else {
					// Check if we already have a device with a mock MAC address for this API key
					const mockMacAddress = generateMockMacAddress(apiKey);

					// Check if we already have a device with this mock MAC address
					const { data: existingMockDevice, error: mockLookupError } =
						await supabase
							.from("devices")
							.select("*")
							.eq("mac_address", mockMacAddress)
							.single();

					if (mockLookupError || !existingMockDevice) {
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

						// Create a new device
						const { data: newDevice, error: createError } = await supabase
							.from("devices")
							.insert({
								mac_address: macAddress || mockMacAddress,
								name: `Unknown device with API ${maskedApiKey}`,
								friendly_id: friendly_id,
								api_key: new_api_key,
								refresh_schedule: {
									default_refresh_rate: refreshRate
										? Number.parseInt(refreshRate, 10)
										: 60,
									time_ranges: [],
								},
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
							})
							.select()
							.single();

						if (createError || !newDevice) {
							// Create an error object with the Supabase error details
							const deviceError: CustomError = new Error(
								"Error creating device for unknown logger",
							);
							deviceError.originalError = createError;

							logError(deviceError, {
								source: "api/log",
								metadata: {
									apiKey: maskedApiKey,
									mockMacAddress,
									friendly_id,
									new_api_key,
									device_status: deviceStatus,
								},
							});

							return NextResponse.json(
								{
									status: 500,
									message: "Failed to process logs from unknown device",
								},
								{ status: 200 },
							); // 200 for device compatibility
						}

						// Use the newly created device
						deviceId = newDevice.friendly_id;
						deviceFound = true;

						logInfo("Created new device for unknown logger", {
							source: "api/log",
							metadata: {
								original_api_key: maskedApiKey,
								new_device_id: deviceId,
								mock_mac_address: mockMacAddress,
								refresh_rate: refreshRate,
								battery_voltage: batteryVoltage,
								fw_version: fwVersion,
								rssi: rssi,
								device_found: deviceFound,
								device_status: deviceStatus,
							},
						});
					} else {
						// Use the existing mock device
						deviceId = existingMockDevice.friendly_id;
						deviceFound = true;
						deviceStatus = "existing_mock";

						// If real MAC address is provided, update the mock device with the real MAC address
						if (macAddress) {
							const { error: updateMacError } = await supabase
								.from("devices")
								.update({
									mac_address: macAddress,
									updated_at: new Date().toISOString(),
								})
								.eq("friendly_id", deviceId);

							if (updateMacError) {
								logError(
									new Error("Error updating MAC address for mock device"),
									{
										source: "api/log",
										metadata: {
											device_id: deviceId,
											error: updateMacError,
										},
									},
								);
							} else {
								logInfo("Updated mock device with real MAC address", {
									source: "api/log",
									metadata: {
										device_id: deviceId,
										mac_address: macAddress,
									},
								});
							}
						}

						// Update the device with the latest metrics
						const { error: updateError } = await supabase
							.from("devices")
							.update({
								last_update_time: new Date().toISOString(),
								next_expected_update: new Date(
									Date.now() +
										(refreshRate
											? Number.parseInt(refreshRate, 10) * 1000
											: 3600 * 1000),
								).toISOString(),
								battery_voltage: batteryVoltage
									? Number.parseFloat(batteryVoltage)
									: existingMockDevice.battery_voltage,
								firmware_version:
									fwVersion || existingMockDevice.firmware_version,
								rssi: rssi
									? Number.parseInt(rssi, 10)
									: existingMockDevice.rssi,
								updated_at: new Date().toISOString(),
							})
							.eq("friendly_id", deviceId);

						if (updateError) {
							logError(new Error("Error updating existing mock device"), {
								source: "api/log",
								metadata: {
									device_id: deviceId,
									error: updateError,
									device_found: deviceFound,
									device_status: deviceStatus,
								},
							});
						}

						logInfo("Using existing mock device for unknown logger", {
							source: "api/log",
							metadata: {
								device_id: deviceId,
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
			} else {
				// Use the found device
				deviceId = device.friendly_id;
				deviceFound = true;
				deviceStatus = "known";

				// If MAC address is provided, update the device with the real MAC address
				if (macAddress && macAddress !== device.mac_address) {
					const { error: updateMacError } = await supabase
						.from("devices")
						.update({
							mac_address: macAddress,
							updated_at: new Date().toISOString(),
						})
						.eq("friendly_id", deviceId);

					if (updateMacError) {
						logError(new Error("Error updating MAC address for device"), {
							source: "api/log",
							metadata: {
								device_id: deviceId,
								error: updateMacError,
							},
						});
					} else {
						logInfo("Updated device with MAC address", {
							source: "api/log",
							metadata: {
								device_id: deviceId,
								mac_address: macAddress,
							},
						});
					}
				}

				// Update device metrics
				const { error: updateError } = await supabase
					.from("devices")
					.update({
						last_update_time: new Date().toISOString(),
						next_expected_update: new Date(
							Date.now() +
								(refreshRate
									? Number.parseInt(refreshRate, 10) * 1000
									: 3600 * 1000),
						).toISOString(),
						battery_voltage: batteryVoltage
							? Number.parseFloat(batteryVoltage)
							: device.battery_voltage,
						firmware_version: fwVersion || device.firmware_version,
						rssi: rssi ? Number.parseInt(rssi, 10) : device.rssi,
						updated_at: new Date().toISOString(),
					})
					.eq("friendly_id", deviceId);

				if (updateError) {
					logError(new Error("Error updating device metrics"), {
						source: "api/log",
						metadata: {
							device_id: deviceId,
							error: updateError,
						},
					});
				}

				logInfo("Device authenticated by API key", {
					source: "api/log",
					metadata: {
						api_key: apiKey,
						device_id: deviceId,
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
		if (!deviceFound) {
			logError(new Error("No device found or created"), {
				source: "api/log",
				metadata: {
					mac_address: macAddress,
					api_key: apiKey,
				},
			});

			return NextResponse.json(
				{
					status: 400,
					message: "No device found or created",
				},
				{ status: 200 },
			); // 200 for device compatibility
		}

		const requestBody: LogRequestBody = await request.json();
		logInfo("Processing logs array", {
			source: "api/log",
			metadata: {
				logs: requestBody.log.logs_array,
				refresh_rate: refreshRate,
				battery_voltage: batteryVoltage,
				fw_version: fwVersion,
				rssi: rssi,
				device_id: deviceId,
				device_found: deviceFound,
				device_status: deviceStatus,
			},
		});

		// Process log data
		const logData: LogData = {
			logs_array: requestBody.log.logs_array.map((log: LogEntry) => ({
				...log,
				timestamp: log.creation_timestamp
					? new Date(log.creation_timestamp * 1000).toISOString()
					: new Date().toISOString(),
			})),
		};

		console.log("📦 Processed log data:", JSON.stringify(logData, null, 2));

		// Insert log with the device ID
		const { error: insertError } = await supabase.from("logs").insert({
			friendly_id: deviceId,
			log_data: logData,
		});

		if (insertError) {
			// Create an error object with the insert error details
			const dbError: CustomError = new Error(
				"Error inserting log with device ID",
			);
			dbError.originalError = insertError;
			console.error(insertError);
			logError(dbError, {
				source: "api/log",
				metadata: {
					device_id: deviceId,
					refresh_rate: refreshRate,
					battery_voltage: batteryVoltage,
					fw_version: fwVersion,
					rssi: rssi,
					device_found: deviceFound,
					device_status: deviceStatus,
				},
			});

			return NextResponse.json(
				{
					status: 500,
					message: "Failed to save logs",
				},
				{ status: 200 },
			); // 200 for device compatibility
		}

		logInfo("Log saved successfully", {
			source: "api/log",
			metadata: {
				device_id: deviceId,
				log_data: logData,
				refresh_rate: refreshRate,
				battery_voltage: batteryVoltage,
				fw_version: fwVersion,
				rssi: rssi,
				device_found: deviceFound,
				device_status: deviceStatus,
			},
		});

		return NextResponse.json(
			{
				status: 200,
				message: "Log received",
			},
			{ status: 200 },
		);
	} catch (error) {
		// The error object already contains the stack trace
		logError(error as Error, {
			source: "api/log",
		});
		return NextResponse.json(
			{
				status: 500,
				message: "Internal server error",
			},
			{ status: 200 },
		); // 200 for device compatibility
	}
}
