"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DeviceFrame } from "@/components/common/device-frame";
import { StatusIndicator } from "@/components/common/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Device } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	compareVersions,
	estimateBatteryLife,
	formatDate,
	formatTimezone,
} from "@/utils/helpers";

interface FirmwareInfo {
	version: string;
	isUpdateAvailable: boolean;
}

const getSignalQuality = (rssi: number): string => {
	if (rssi >= -50) return "Excellent";
	if (rssi >= -60) return "Good";
	if (rssi >= -70) return "Fair";
	if (rssi >= -80) return "Poor";
	return "Very Poor";
};

const calculateRefreshPerDay = (
	deviceData: Device & { status?: string; type?: string },
): number => {
	if (!deviceData?.refresh_schedule) return 0;
	const defaultRefreshRate =
		deviceData.refresh_schedule.default_refresh_rate || 300;
	let refreshesPerDay = (24 * 60 * 60) / defaultRefreshRate;
	if (
		deviceData.refresh_schedule.time_ranges &&
		deviceData.refresh_schedule.time_ranges.length > 0
	) {
		for (const range of deviceData.refresh_schedule.time_ranges) {
			const [startHour, startMinute] = range.start_time.split(":").map(Number);
			const [endHour, endMinute] = range.end_time.split(":").map(Number);
			const startTimeInMinutes = startHour * 60 + startMinute;
			const endTimeInMinutes = endHour * 60 + endMinute;
			const durationInHours = (endTimeInMinutes - startTimeInMinutes) / 60;
			const rangeRefreshes = (durationInHours * 60 * 60) / range.refresh_rate;
			refreshesPerDay =
				refreshesPerDay -
				(durationInHours * 60 * 60) / defaultRefreshRate +
				rangeRefreshes;
		}
	}
	return Math.max(0, refreshesPerDay);
};

const getGrayscaleLevels = (grayscale: number | null | undefined): number => {
	if (grayscale === 2 || grayscale === 4 || grayscale === 16) return grayscale;
	return 2;
};

interface DeviceViewProps {
	device: Device & { status?: string; type?: string };
	playlistScreens: { screen: string; duration: number }[];
}

function PanelHeader({
	label,
	right,
}: {
	label: string;
	right?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
			<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</h3>
			{right}
		</div>
	);
}

function MetaPair({
	label,
	children,
	mono,
}: {
	label: string;
	children: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<span className={cn("text-sm", mono && "font-mono")}>{children}</span>
		</div>
	);
}

export default function DeviceView({
	device,
	playlistScreens,
}: DeviceViewProps) {
	const [firmwareInfo, setFirmwareInfo] = useState<FirmwareInfo | null>(null);

	useEffect(() => {
		const fetchLatestFirmware = async () => {
			try {
				const response = await fetch(
					"https://api.github.com/repos/usetrmnl/trmnl-firmware/releases/latest",
					{ headers: { Accept: "application/vnd.github.v3+json" } },
				);
				if (!response.ok) return;
				const data = await response.json();
				const latestVersion = (data.tag_name || "").replace(/^v/i, "");
				if (latestVersion && device.firmware_version) {
					setFirmwareInfo({
						version: latestVersion,
						isUpdateAvailable:
							compareVersions(device.firmware_version, latestVersion) < 0,
					});
				}
			} catch (error) {
				console.error("Failed to fetch firmware info:", error);
			}
		};
		fetchLatestFirmware();
	}, [device.firmware_version]);

	const isPortrait = device.screen_orientation === "portrait";
	const deviceWidth = isPortrait
		? device.screen_height || DEFAULT_IMAGE_HEIGHT
		: device.screen_width || DEFAULT_IMAGE_WIDTH;
	const deviceHeight = isPortrait
		? device.screen_width || DEFAULT_IMAGE_WIDTH
		: device.screen_height || DEFAULT_IMAGE_HEIGHT;
	const grayscaleLevels = getGrayscaleLevels(device.grayscale);

	const status: "online" | "offline" =
		device.status === "online" ? "online" : "offline";
	const refreshPerDay = calculateRefreshPerDay(device);
	const batteryEstimate = device.battery_voltage
		? estimateBatteryLife(device.battery_voltage, refreshPerDay)
		: null;

	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
			{/* Identity + health */}
			<section className="flex flex-col overflow-hidden rounded-2xl border bg-card">
				<PanelHeader
					label="Identity"
					right={
						<span
							className="text-[11px] text-muted-foreground tabular-nums"
							suppressHydrationWarning
						>
							{device.last_update_time
								? `Last seen ${formatDate(device.last_update_time)}`
								: "—"}
						</span>
					}
				/>
				<div className="grid gap-3 p-4 sm:grid-cols-2">
					<MetaPair label="Status">
						<span className="inline-flex items-center gap-1.5 capitalize">
							<StatusIndicator status={status} size="sm" />
							{device.status}
						</span>
					</MetaPair>
					<MetaPair label="Friendly ID" mono>
						{device.friendly_id}
					</MetaPair>
					<MetaPair label="MAC" mono>
						{device.mac_address}
					</MetaPair>
					<MetaPair label="Timezone">
						{formatTimezone(device.timezone)}
					</MetaPair>
				</div>
				<div className="border-t bg-muted/20 px-4 py-3">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Firmware
						</span>
						<span className="font-mono">
							{device.firmware_version || "Unknown"}
						</span>
						{firmwareInfo?.isUpdateAvailable && (
							<>
								<Badge
									variant="outline"
									className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
								>
									Update available · v{firmwareInfo.version}
								</Badge>
								<Link
									href="https://usetrmnl.com/flash"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Button
										variant="link"
										size="sm"
										className="h-auto gap-1 p-0 text-xs"
									>
										Flash
										<ExternalLink className="h-3 w-3" />
									</Button>
								</Link>
							</>
						)}
					</div>
				</div>
			</section>

			{/* Health: WiFi + battery */}
			<section className="flex flex-col overflow-hidden rounded-2xl border bg-card">
				<PanelHeader label="Health" />
				<div className="space-y-3 p-4">
					<div className="flex items-center justify-between text-sm">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							WiFi
						</span>
						<span className="tabular-nums">
							{device.rssi
								? `${device.rssi} dBm · ${getSignalQuality(device.rssi)}`
								: "Unknown"}
						</span>
					</div>
					{batteryEstimate && (
						<div className="space-y-2">
							<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								Battery
							</div>
							<div className="flex flex-wrap items-center gap-3 text-sm">
								<div className="flex items-center">
									<Progress
										value={batteryEstimate.batteryPercentage}
										className={cn(
											"h-5 w-12 rounded-sm border border-primary",
											batteryEstimate.batteryPercentage < 20 &&
												"[&>[data-slot=progress-indicator]]:bg-destructive",
											batteryEstimate.batteryPercentage >= 20 &&
												batteryEstimate.batteryPercentage < 50 &&
												"[&>[data-slot=progress-indicator]]:bg-amber-500",
										)}
									/>
									<div className="ml-[1px] h-2 w-0.5 rounded-r-sm bg-primary" />
								</div>
								<span className="font-medium tabular-nums">
									{batteryEstimate.isCharging
										? "Charging"
										: `${batteryEstimate.batteryPercentage}%`}
								</span>
								<span className="text-muted-foreground tabular-nums">
									{device.battery_voltage}V
								</span>
								<span className="text-xs text-muted-foreground">
									{batteryEstimate.isCharging
										? "Estimating while charging"
										: `~${batteryEstimate.remainingDays} days at ${refreshPerDay} refreshes/day`}
								</span>
							</div>
						</div>
					)}
				</div>
			</section>

			{/* Display + refresh */}
			<section className="flex flex-col overflow-hidden rounded-2xl border bg-card lg:col-span-2">
				<PanelHeader
					label="Display"
					right={
						<span
							className="text-[11px] text-muted-foreground tabular-nums"
							suppressHydrationWarning
						>
							Next update:{" "}
							{device.next_expected_update
								? formatDate(device.next_expected_update)
								: "Unknown"}
						</span>
					}
				/>
				<div className="grid gap-3 p-4 sm:grid-cols-3">
					<MetaPair label="Mode">
						<span className="capitalize">{device.display_mode}</span>
					</MetaPair>
					<MetaPair label="Last refresh">
						{device.last_refresh_duration
							? `${device.last_refresh_duration}s`
							: "Unknown"}
					</MetaPair>
					<MetaPair label="Default refresh">
						{device?.refresh_schedule?.default_refresh_rate || 300}s
					</MetaPair>
				</div>
				<p className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
					{device.display_mode === DeviceDisplayMode.PLAYLIST
						? "Rotating screens from the selected playlist."
						: device.display_mode === DeviceDisplayMode.MIXUP
							? "Split-screen layout combining multiple recipes."
							: "Single screen rendering the selected component."}
				</p>
			</section>

			{/* Preview */}
			<section className="overflow-hidden rounded-2xl border bg-card lg:col-span-2">
				<PanelHeader
					label="Preview"
					right={
						<span className="text-[11px] tabular-nums text-muted-foreground">
							{deviceWidth}×{deviceHeight}px ·{" "}
							<span className="capitalize">
								{isPortrait ? "portrait" : "landscape"}
							</span>{" "}
							· {grayscaleLevels} levels
						</span>
					}
				/>
				<div className="bg-[radial-gradient(circle_at_50%_0%,theme(colors.muted/40),transparent_70%)] p-6">
					{device.display_mode === DeviceDisplayMode.PLAYLIST &&
					device.playlist_id &&
					playlistScreens.length > 0 ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
							{playlistScreens.map((screen) => (
								<div key={screen.screen} className="space-y-1">
									<DeviceFrame size="md" portrait={isPortrait}>
										<Image
											src={`/api/bitmap/${screen.screen || "simple-text"}.bmp?width=${deviceWidth}&height=${deviceHeight}`}
											alt="Playlist screen"
											fill
											className="absolute inset-0 h-full w-full object-cover"
											style={{ imageRendering: "pixelated" }}
											unoptimized
										/>
									</DeviceFrame>
									<div className="flex items-center justify-between text-[11px] text-muted-foreground">
										<span className="truncate font-medium text-foreground">
											{screen.screen}
										</span>
										<span className="tabular-nums">{screen.duration}s</span>
									</div>
								</div>
							))}
						</div>
					) : (
						<div
							className={cn(
								"mx-auto w-full",
								isPortrait ? "max-w-[260px]" : "max-w-[520px]",
							)}
						>
							<DeviceFrame size="lg" portrait={isPortrait}>
								{device.display_mode === DeviceDisplayMode.MIXUP &&
								device.mixup_id ? (
									<Image
										src={`/api/bitmap/mixup/${device.mixup_id}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${grayscaleLevels}`}
										alt="Mixup preview"
										fill
										className="absolute inset-0 h-full w-full object-cover"
										style={{ imageRendering: "pixelated" }}
										unoptimized
									/>
								) : (
									<Image
										src={`/api/bitmap/${device?.screen || "simple-text"}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${grayscaleLevels}`}
										alt="Device screen"
										fill
										className="absolute inset-0 h-full w-full object-cover"
										style={{ imageRendering: "pixelated" }}
										unoptimized
									/>
								)}
							</DeviceFrame>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
