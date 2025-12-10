"use client";

import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Device } from "@/lib/types";
import {
	estimateBatteryLife,
	formatDate,
	formatTimezone,
} from "@/utils/helpers";

// Helper function to convert RSSI to signal quality description
const getSignalQuality = (rssi: number): string => {
	if (rssi >= -50) return "Excellent";
	if (rssi >= -60) return "Good";
	if (rssi >= -70) return "Fair";
	if (rssi >= -80) return "Poor";
	return "Very Poor";
};

// Calculate refresh per day based on refresh schedule
const calculateRefreshPerDay = (
	deviceData: Device & { status?: string; type?: string },
): number => {
	if (!deviceData || !deviceData.refresh_schedule) return 0;

	// Default refresh rate in seconds
	const defaultRefreshRate =
		deviceData.refresh_schedule.default_refresh_rate || 300;

	// Calculate refreshes per day from default rate
	let refreshesPerDay = (24 * 60 * 60) / defaultRefreshRate;

	// Adjust for time ranges if they exist
	if (
		deviceData.refresh_schedule.time_ranges &&
		deviceData.refresh_schedule.time_ranges.length > 0
	) {
		// This is a simplified calculation - a more accurate one would account for overlapping ranges
		for (const range of deviceData.refresh_schedule.time_ranges) {
			// Parse start and end times
			const [startHour, startMinute] = range.start_time.split(":").map(Number);
			const [endHour, endMinute] = range.end_time.split(":").map(Number);

			// Calculate duration in hours
			const startTimeInMinutes = startHour * 60 + startMinute;
			const endTimeInMinutes = endHour * 60 + endMinute;
			const durationInHours = (endTimeInMinutes - startTimeInMinutes) / 60;

			// Calculate refreshes during this time range
			const rangeRefreshes = (durationInHours * 60 * 60) / range.refresh_rate;

			// Subtract default refreshes during this period and add custom refreshes
			refreshesPerDay =
				refreshesPerDay -
				(durationInHours * 60 * 60) / defaultRefreshRate +
				rangeRefreshes;
		}
	}

	return Math.max(0, refreshesPerDay);
};

// Map grayscale value to number of gray levels (2, 4, or 16)
const getGrayscaleLevels = (grayscale: number | null | undefined): number => {
	if (grayscale === 2 || grayscale === 4 || grayscale === 16) {
		return grayscale;
	}
	return 2; // Default to 2 levels (black/white)
};

interface DeviceViewProps {
	device: Device & { status?: string; type?: string };
	playlistScreens: { screen: string; duration: number }[];
}

export default function DeviceView({
	device,
	playlistScreens,
}: DeviceViewProps) {
	const orientation = device.screen_orientation || "landscape";
	const deviceWidth =
		orientation === "landscape"
			? device.screen_width || DEFAULT_IMAGE_WIDTH
			: device.screen_height || DEFAULT_IMAGE_HEIGHT;
	const deviceHeight =
		orientation === "landscape"
			? device.screen_height || DEFAULT_IMAGE_HEIGHT
			: device.screen_width || DEFAULT_IMAGE_WIDTH;

	const deviceGrayscaleLevels = getGrayscaleLevels(device.grayscale);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-1">
				<CardTitle className="text-base">Device Overview</CardTitle>
				<p className="text-xs text-muted-foreground">
					At-a-glance health, identity, and what the screen is showing now.
				</p>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-4">
					<div className="rounded-lg border bg-muted/30 p-4 space-y-2">
						<div className="flex flex-wrap items-center gap-2 text-sm">
							<span
								className={`inline-block h-2 w-2 rounded-full ${device.status === "online" ? "bg-green-500" : "bg-red-500"}`}
							/>
							<span className="capitalize font-medium">{device.status}</span>
							{device.last_update_time && (
								<span className="text-muted-foreground">
									Last update: {formatDate(device.last_update_time)}
								</span>
							)}
						</div>
						<div className="grid gap-3 sm:grid-cols-2 text-sm">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Name</span>
								<span className="font-medium">{device.name}</span>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Friendly ID</span>
								<span className="font-mono">{device.friendly_id}</span>
								<span className="text-xs text-muted-foreground">
									MAC: {device.mac_address}
								</span>
							</div>
						</div>
						<div className="grid gap-3 sm:grid-cols-2 text-sm">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Timezone</span>
								<span>{formatTimezone(device.timezone)}</span>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Firmware</span>
								<span>{device.firmware_version || "Unknown"}</span>
							</div>
						</div>
					</div>

					<div className="rounded-lg border p-4 space-y-3">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">WiFi Signal</span>
							<span>
								{device.rssi
									? `${device.rssi} dBm (${getSignalQuality(device.rssi)})`
									: "Unknown"}
							</span>
						</div>
						{device.battery_voltage && (
							<div className="space-y-2">
								<div className="text-sm text-muted-foreground">
									Battery Status
								</div>
								{(() => {
									const refreshPerDay = calculateRefreshPerDay(device);
									const batteryEstimate = estimateBatteryLife(
										device.battery_voltage,
										refreshPerDay,
									);

									let batteryColor = "bg-primary";
									if (batteryEstimate.batteryPercentage < 20) {
										batteryColor = "bg-red-500";
									} else if (batteryEstimate.batteryPercentage < 50) {
										batteryColor = "bg-yellow-500";
									}

									return (
										<div className="flex flex-wrap items-center gap-2 text-sm">
											<div className="flex items-center">
												<div className="relative w-10 h-5 border-1 border-primary rounded-sm p-0.5 overflow-hidden shadow-inner shadow-background/20">
													<div
														className={`h-full rounded-[calc(var(--radius)-7px)] transition-all duration-300 ease-in-out ${batteryColor} flex items-center justify-center`}
														style={{
															width: `${batteryEstimate.batteryPercentage}%`,
														}}
													>
														{batteryEstimate.isCharging && (
															<span className="bg-green-400 text-transparent bg-clip-text">
																⚡️
															</span>
														)}
													</div>
												</div>
												<div className="ml-[1px] h-2 w-0.5 bg-primary rounded-r-sm" />
											</div>
											<span className="font-medium">
												{batteryEstimate.isCharging
													? "Charging"
													: `${batteryEstimate.batteryPercentage}%`}
											</span>
											<span className="font-medium">
												{device.battery_voltage}V
											</span>
											<span className="text-muted-foreground">
												{batteryEstimate.isCharging
													? "Estimating while charging"
													: `~${batteryEstimate.remainingDays} days at ${refreshPerDay} refreshes/day`}
											</span>
										</div>
									);
								})()}
							</div>
						)}
					</div>

					<div className="rounded-lg border p-4 space-y-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2 text-sm font-medium">
								<span className="text-muted-foreground">Display Mode</span>
								<span className="capitalize">{device.display_mode}</span>
							</div>
							<div className="text-xs text-muted-foreground">
								Next update:{" "}
								{device.next_expected_update
									? formatDate(device.next_expected_update)
									: "Unknown"}
							</div>
						</div>
						<div className="grid gap-2 text-sm sm:grid-cols-2">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Last refresh</span>
								<span>
									{device.last_refresh_duration
										? `${device.last_refresh_duration}s`
										: "Unknown duration"}
								</span>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Default refresh</span>
								<span>
									{device?.refresh_schedule?.default_refresh_rate || 300}s
								</span>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							{device.display_mode === DeviceDisplayMode.PLAYLIST
								? "Rotating screens from the selected playlist."
								: device.display_mode === DeviceDisplayMode.MIXUP
									? "Split-screen layout combining multiple recipes."
									: "Single screen rendering the selected component."}
						</p>
					</div>
				</div>

				<div className="rounded-lg border p-4 space-y-4">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-sm font-medium">Preview</p>
							<p className="text-xs text-muted-foreground">
								Rendered at current dimensions and grayscale.
							</p>
						</div>
						<div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
							<span>
								{deviceWidth}×{deviceHeight}px
							</span>
							<span className="capitalize">{orientation}</span>
						</div>
					</div>

					{device.display_mode === DeviceDisplayMode.PLAYLIST &&
					device.playlist_id ? (
						<>
							<p className="text-sm text-muted-foreground">
								Playlist preview shows current screens in rotation.
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
								{playlistScreens.map((screen) => (
									<div
										className="max-w-[300px]"
										style={{
											maxHeight: `${(300 * deviceHeight) / deviceWidth}px`,
										}}
										key={screen.screen}
									>
										<AspectRatio ratio={deviceWidth / deviceHeight}>
											<Image
												src={`/api/bitmap/${screen.screen || "simple-text"}.bmp?width=${deviceWidth}&height=${deviceHeight}`}
												alt="Device Screen"
												fill
												className="object-cover rounded-xs ring-2 ring-gray-200"
												style={{ imageRendering: "pixelated" }}
												unoptimized
											/>
										</AspectRatio>
									</div>
								))}
							</div>
						</>
					) : (
						<div
							className="max-w-[320px]"
							style={{
								maxHeight: `${(320 * deviceHeight) / deviceWidth}px`,
							}}
						>
							<AspectRatio ratio={deviceWidth / deviceHeight}>
								{device.display_mode === DeviceDisplayMode.MIXUP &&
								device.mixup_id ? (
									<Image
										src={`/api/bitmap/mixup/${device.mixup_id}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${deviceGrayscaleLevels}`}
										alt="Mixup Preview"
										fill
										className="object-cover rounded-xs ring-2 ring-gray-200"
										style={{ imageRendering: "pixelated" }}
										unoptimized
									/>
								) : (
									<Image
										src={`/api/bitmap/${device?.screen || "simple-text"}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${deviceGrayscaleLevels}`}
										alt="Device Screen"
										fill
										className="object-cover rounded-xs ring-2 ring-gray-200"
										style={{ imageRendering: "pixelated" }}
										unoptimized
									/>
								)}
							</AspectRatio>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
