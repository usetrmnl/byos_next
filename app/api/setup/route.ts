import { NextResponse } from "next/server";
import type { CustomError } from "@/lib/api/types";
import { logError, logInfo } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey, generateFriendlyId } from "@/utils/helpers";

export async function GET(request: Request) {
	try {
		const macAddress = request.headers.get("ID")?.toUpperCase();
		const apiKey = request.headers.get("Access-Token");
		const { supabase } = await createClient();

		if (!supabase) {
			console.warn(
				"Supabase client not initialized, using noDB mode, skipping device setup",
			);
			logInfo(
				"Supabase client not initialized, using noDB mode, skipping device setup",
				{
					source: "api/setup",
					metadata: { macAddress, apiKey },
				},
			);
			return NextResponse.json(
				{
					status: 200,
					message: "Device setup skipped",
				},
				{ status: 200 },
			);
		}

		if (!macAddress) {
			const error = new Error("Missing ID header");
			logError(error, {
				source: "api/setup",
				metadata: { macAddress, apiKey },
			});
			return NextResponse.json(
				{
					status: 404,
					api_key: null,
					friendly_id: null,
					image_url: null,
					message: "ID header is required",
				},
				{ status: 200 },
			); // Status 200 for device compatibility
		}

		// First check if the device exists by MAC address
		const { data: device, error } = await supabase
			.from("devices")
			.select("*")
			.eq("mac_address", macAddress)
			.single();

		// If API key is provided and device not found by MAC, check if the API key exists
		if ((error || !device) && apiKey) {
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
						source: "api/setup",
						metadata: {
							device_id: deviceByApiKey.friendly_id,
							mac_address: macAddress,
							api_key: apiKey,
							error: updateError,
						},
					});
				} else {
					logInfo("Updated device MAC address", {
						source: "api/setup",
						metadata: {
							device_id: deviceByApiKey.friendly_id,
							mac_address: macAddress,
							api_key: apiKey,
						},
					});
				}

				// Return the existing device info
				return NextResponse.json(
					{
						status: 200,
						api_key: deviceByApiKey.api_key,
						friendly_id: deviceByApiKey.friendly_id,
						image_url: null,
						filename: null,
						message: `Device ${deviceByApiKey.friendly_id} updated with new MAC address!`,
					},
					{ status: 200 },
				);
			}
		}

		// If device not found by MAC address or API key, create a new one
		if (error || !device) {
			const friendly_id = generateFriendlyId(
				macAddress,
				new Date().toISOString().replace(/[-:Z]/g, ""),
			);
			// Use provided API key if available, otherwise generate a new one
			const api_key =
				apiKey ||
				generateApiKey(
					macAddress,
					new Date().toISOString().replace(/[-:Z]/g, ""),
				);

			const { data: newDevice, error: createError } = await supabase
				.from("devices")
				.insert({
					mac_address: macAddress,
					name: `TRMNL Device ${friendly_id}`,
					friendly_id: friendly_id,
					api_key: api_key,
					refresh_schedule: {
						default_refresh_rate: 60, // Default refresh rate in seconds
						time_ranges: [
							{
								start_time: "00:00", // Start of the time range
								end_time: "07:00", // End of the time range
								refresh_rate: 3600, // Refresh rate in seconds
							},
						],
					},
					last_update_time: new Date().toISOString(), // Current time as last update
					next_expected_update: new Date(
						Date.now() + 3600 * 1000,
					).toISOString(), // 1 hour from now
					timezone: "Europe/London", // Default timezone
				})
				.select()
				.single();

			if (createError || !newDevice) {
				// Create an error object with the Supabase error details
				const deviceError: CustomError = new Error("Error creating device");
				// Attach the original error information
				(deviceError as CustomError).originalError = createError;

				logError(deviceError, {
					source: "api/setup",
					metadata: { macAddress, friendly_id, api_key },
				});

				return NextResponse.json(
					{
						status: 500,
						reset_firmware: false,
						message: `Error creating new device. ${friendly_id}|${api_key}`,
					},
					{ status: 200 },
				);
			}

			logInfo(`New device ${newDevice.friendly_id} created!`, {
				source: "api/setup",
				metadata: {
					friendly_id: newDevice.friendly_id,
					mac_address: macAddress,
					api_key: api_key,
				},
			});
			return NextResponse.json(
				{
					status: 200,
					api_key: newDevice.api_key,
					friendly_id: newDevice.friendly_id,
					image_url: null,
					filename: null,
					message: `Device ${newDevice.friendly_id} added to BYOS!`,
				},
				{ status: 200 },
			);
		}

		// Device exists by MAC address - check if we need to update the API key
		if (apiKey && apiKey !== device.api_key) {
			const { error: updateError } = await supabase
				.from("devices")
				.update({
					api_key: apiKey,
					updated_at: new Date().toISOString(),
				})
				.eq("friendly_id", device.friendly_id);

			if (updateError) {
				logError(new Error("Error updating API key for device"), {
					source: "api/setup",
					metadata: {
						device_id: device.friendly_id,
						mac_address: macAddress,
						error: updateError,
					},
				});
			} else {
				logInfo("Updated API key for device", {
					source: "api/setup",
					metadata: {
						device_id: device.friendly_id,
						mac_address: macAddress,
					},
				});
				// Update the device object with the new API key
				device.api_key = apiKey;
			}
		}

		logInfo(`Device ${device.friendly_id} added to BYOS!`, {
			source: "api/setup",
			metadata: {
				friendly_id: device.friendly_id,
				mac_address: macAddress,
				api_key: device.api_key,
			},
		});
		return NextResponse.json(
			{
				status: 200,
				api_key: device.api_key,
				friendly_id: device.friendly_id,
				image_url: null,
				filename: null,
				message: `Device ${device.friendly_id} added to BYOS!`,
			},
			{ status: 200 },
		);
	} catch (error) {
		// The error object already contains the stack trace
		logError(error as Error, {
			source: "api/setup",
		});
		return NextResponse.json(
			{
				status: 500,
				error: "Internal server error",
			},
			{ status: 200 },
		);
	}
}
