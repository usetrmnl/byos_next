"use client";

import {
	Battery,
	BatteryCharging,
	BatteryLow,
	ExternalLink,
	ListMusic,
	Monitor,
	RefreshCw,
	Shuffle,
	TimerReset,
	Wifi,
	WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DeviceFrame } from "@/components/common/device-frame";
import { PanelHeader } from "@/components/common/panel-header";
import { ScreenPreviewImage } from "@/components/common/screen-preview-image";
import { StatusIndicator } from "@/components/common/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UI_REFRESH_FALLBACK_SECONDS } from "@/lib/device/defaults";
import { getOrientedDeviceDimensions } from "@/lib/device/dimensions";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	buildDeviceErrorPreviewSrc,
	buildDevicePreviewSrc,
	buildScreenPreviewSrc,
} from "@/lib/render/preview-image";
import { resolveDeviceProfileFromCatalog } from "@/lib/trmnl/device-profile-client";
import type { TrmnlModel, TrmnlPalette } from "@/lib/trmnl/types";
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
		deviceData.refresh_schedule.default_refresh_rate ||
		UI_REFRESH_FALLBACK_SECONDS;
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

interface DeviceViewProps {
	device: Device & { status?: string; type?: string };
	playlistScreens: { screen: string; duration: number }[];
	trmnlModels: TrmnlModel[];
	trmnlPalettes: TrmnlPalette[];
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
	trmnlModels,
	trmnlPalettes,
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

	const {
		width: deviceWidth,
		height: deviceHeight,
		isPortrait,
	} = getOrientedDeviceDimensions(device);
	const { selectedPalette } = resolveDeviceProfileFromCatalog({
		modelName: device.model,
		paletteId: device.palette_id,
		models: trmnlModels,
		palettes: trmnlPalettes,
	});
	const screenAspectRatio = `${deviceWidth} / ${deviceHeight}`;

	const refreshPerDay = calculateRefreshPerDay(device);
	const batteryEstimate = device.battery_voltage
		? estimateBatteryLife(device.battery_voltage, refreshPerDay)
		: null;
	const defaultRefreshRate =
		device.refresh_schedule?.default_refresh_rate ||
		UI_REFRESH_FALLBACK_SECONDS;
	const healthItems = getHealthItems(
		device,
		batteryEstimate,
		defaultRefreshRate,
	);

	const isPlaylist =
		device.display_mode === DeviceDisplayMode.PLAYLIST &&
		!!device.playlist_id &&
		playlistScreens.length > 0;
	const heroSrc = buildDevicePreviewSrc(device, {
		width: deviceWidth,
		height: deviceHeight,
		playlistScreen: playlistScreens[0]?.screen,
	});

	return (
		<div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
			{/* Hero preview — left column, matches dashboard "Latest Screen" */}
			<section className="flex flex-col overflow-hidden rounded-2xl border bg-card">
				<PanelHeader
					label="Preview"
					right={
						<span className="text-[11px] tabular-nums text-muted-foreground">
							{deviceWidth}×{deviceHeight}px ·{" "}
							<span className="capitalize">
								{isPortrait ? "portrait" : "landscape"}
							</span>
							{selectedPalette ? ` · ${selectedPalette.name}` : ""}
						</span>
					}
				/>
				<div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_0%,theme(colors.muted/40),transparent_70%)] p-6">
					<div
						className={cn(
							"w-full",
							isPortrait ? "max-w-[260px]" : "max-w-[520px]",
						)}
					>
						<DeviceFrame
							size="lg"
							portrait={isPortrait}
							screenAspectRatio={screenAspectRatio}
						>
							<ScreenPreviewImage
								src={heroSrc}
								alt="Device screen"
								className="absolute inset-0"
							/>
						</DeviceFrame>
					</div>
				</div>
				{isPlaylist && (
					<div className="border-t bg-muted/20 px-4 py-3">
						<div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							<span>Rotation</span>
							<span className="tabular-nums">
								{playlistScreens.length}{" "}
								{playlistScreens.length === 1 ? "screen" : "screens"}
							</span>
						</div>
						<div className="flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
							{playlistScreens.map((screen, i) => (
								<div
									key={`${screen.screen}-${i}`}
									className="w-[110px] shrink-0 space-y-1"
								>
									<DeviceFrame
										size="sm"
										portrait={isPortrait}
										screenAspectRatio={screenAspectRatio}
										flat
									>
										<ScreenPreviewImage
											src={
												screen.screen
													? buildScreenPreviewSrc(
															screen.screen,
															device,
															deviceWidth,
															deviceHeight,
														)
													: buildDeviceErrorPreviewSrc(
															device,
															deviceWidth,
															deviceHeight,
															"Playlist item has no screen",
														)
											}
											alt={`Frame ${i + 1}`}
											className="absolute inset-0"
										/>
									</DeviceFrame>
									<div className="flex items-center justify-between text-[10px] text-muted-foreground">
										<span className="tabular-nums">#{i + 1}</span>
										<span className="tabular-nums">{screen.duration}s</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				<footer className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
					<span>
						Passive device — this preview may be newer than what&apos;s
						currently on the screen.
					</span>
				</footer>
			</section>

			{/* Right column: stacked detail panels */}
			<div className="flex flex-col gap-4">
				{/* Health */}
				<section className="flex flex-col overflow-hidden rounded-2xl border bg-card">
					<PanelHeader label="Health" />
					<div className="flex flex-wrap items-center gap-2 p-4">
						{healthItems.map((item) => (
							<HealthChip key={item.id} {...item} />
						))}
					</div>
				</section>

				{/* Identity */}
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
			</div>
		</div>
	);
}

type HealthItem = {
	id: string;
	icon: React.ReactNode;
	text: string;
	label: string;
};

function getHealthItems(
	device: Device & { status?: string },
	battery: ReturnType<typeof estimateBatteryLife> | null,
	defaultRefreshRate: number,
): HealthItem[] {
	const status = device.status === "online" ? "online" : "offline";
	const { rssi } = device;
	const mode = device.display_mode;
	const next = device.next_expected_update;

	const wifiTone =
		rssi == null
			? "text-muted-foreground"
			: rssi >= -60
				? "text-green-600 dark:text-green-400"
				: rssi >= -70
					? "text-amber-600 dark:text-amber-400"
					: rssi >= -80
						? "text-orange-600 dark:text-orange-400"
						: "text-red-600 dark:text-red-400";
	const WifiIcon = rssi != null ? Wifi : WifiOff;

	const batteryTone = !battery
		? "text-muted-foreground"
		: battery.isCharging || battery.batteryPercentage >= 50
			? "text-green-600 dark:text-green-400"
			: battery.batteryPercentage < 20
				? "text-red-600 dark:text-red-400"
				: "text-amber-600 dark:text-amber-400";
	const BatteryIcon = battery?.isCharging
		? BatteryCharging
		: battery && battery.batteryPercentage < 20
			? BatteryLow
			: Battery;

	const ModeIcon =
		mode === DeviceDisplayMode.PLAYLIST
			? ListMusic
			: mode === DeviceDisplayMode.MIXUP
				? Shuffle
				: Monitor;
	const modeText =
		mode === DeviceDisplayMode.PLAYLIST
			? "Playlist"
			: mode === DeviceDisplayMode.MIXUP
				? "Mixup"
				: "Screen";

	return [
		{
			id: "status",
			icon: <StatusIndicator status={status} size="sm" />,
			text: status === "online" ? "Online" : "Offline",
			label: `Status: ${status}`,
		},
		{
			id: "wifi",
			icon: <WifiIcon className={cn("h-4 w-4", wifiTone)} />,
			text: rssi != null ? `${rssi} dBm` : "No RSSI",
			label:
				rssi != null
					? `WiFi ${rssi} dBm · ${getSignalQuality(rssi)}`
					: "WiFi RSSI not reported",
		},
		{
			id: "battery",
			icon: <BatteryIcon className={cn("h-4 w-4", batteryTone)} />,
			text: battery
				? battery.isCharging
					? "Charging"
					: `${battery.batteryPercentage}%`
				: "No batt",
			label: battery
				? `Battery ${battery.isCharging ? "charging" : `${battery.batteryPercentage}%`} (${device.battery_voltage}V)`
				: "Battery not reported",
		},
		{
			id: "mode",
			icon: <ModeIcon className="h-4 w-4 text-muted-foreground" />,
			text: modeText,
			label: `Mode: ${mode}`,
		},
		{
			id: "next",
			icon: <TimerReset className="h-4 w-4 text-muted-foreground" />,
			text: next ? formatDate(next) : "—",
			label: next
				? `Next refresh: ${formatDate(next)}`
				: "Next refresh unknown",
		},
		{
			id: "refresh",
			icon: <RefreshCw className="h-4 w-4 text-muted-foreground" />,
			text: `${defaultRefreshRate}s`,
			label: `Default refresh: ${defaultRefreshRate}s`,
		},
	];
}

function HealthChip({ icon, text, label }: HealthItem) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border bg-muted/30 px-2 transition-colors hover:bg-muted/60"
					role="img"
					aria-label={label}
				>
					{icon}
					<span className="text-xs font-medium tabular-nums">{text}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}
