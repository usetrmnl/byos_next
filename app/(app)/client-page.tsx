"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { DeviceFrame } from "@/components/common/device-frame";
import { ScreenPreviewImage } from "@/components/common/screen-preview-image";
import { StatusIndicator } from "@/components/common/status-indicator";
import { RecentSystemLogs } from "@/components/system-logs/recent-system-logs";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrientedDeviceDimensions } from "@/lib/device/dimensions";
import { buildDevicePreviewSrc } from "@/lib/render/preview-image";
import type { Device, SystemLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate, getDeviceStatus } from "@/utils/helpers";

interface DashboardClientPageProps {
	devices: Device[];
	systemLogs: SystemLog[];
	firstScreenByPlaylistId: Record<string, string>;
}

export default function DashboardClientPage({
	devices,
	systemLogs,
	firstScreenByPlaylistId,
}: DashboardClientPageProps) {
	const processedDevices = devices.map((device) => ({
		...device,
		status: getDeviceStatus(device),
	}));

	const onlineDevices = processedDevices.filter((d) => d.status === "online");
	const offlineDevices = processedDevices.filter((d) => d.status === "offline");

	const lastUpdatedDevice =
		processedDevices.length > 0
			? [...processedDevices].sort(
					(a, b) =>
						new Date(b.last_update_time || "").getTime() -
						new Date(a.last_update_time || "").getTime(),
				)[0]
			: null;

	const {
		width: previewWidth,
		height: previewHeight,
		isPortrait,
	} = getOrientedDeviceDimensions(lastUpdatedDevice);
	const latestScreenSrc = lastUpdatedDevice
		? buildDevicePreviewSrc(lastUpdatedDevice, {
				width: previewWidth,
				height: previewHeight,
				playlistScreen: lastUpdatedDevice.playlist_id
					? firstScreenByPlaylistId[lastUpdatedDevice.playlist_id]
					: null,
			})
		: "";

	return (
		<div className="space-y-4">
			<div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
				{/* Latest screen preview */}
				<section className="flex flex-col overflow-hidden rounded-2xl border bg-card">
					<header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
						<div className="flex items-center gap-2">
							<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Latest screen
							</h3>
						</div>
						{lastUpdatedDevice && (
							<div
								className="truncate text-xs text-muted-foreground"
								suppressHydrationWarning
							>
								<Link
									href={`/device/${lastUpdatedDevice.friendly_id}`}
									className="font-medium text-foreground hover:text-primary"
								>
									{lastUpdatedDevice.name}
								</Link>{" "}
								· {formatDate(lastUpdatedDevice.last_update_time)}
							</div>
						)}
					</header>

					<div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_0%,theme(colors.muted/40),transparent_70%)] p-6">
						{lastUpdatedDevice ? (
							<div
								className={cn(
									"w-full",
									isPortrait ? "max-w-[260px]" : "max-w-[520px]",
								)}
							>
								<DeviceFrame
									size="lg"
									portrait={isPortrait}
									screenAspectRatio={`${previewWidth} / ${previewHeight}`}
								>
									<ScreenPreviewImage
										src={latestScreenSrc}
										alt={`${lastUpdatedDevice.name} screen`}
										className="absolute inset-0"
									/>
								</DeviceFrame>
							</div>
						) : (
							<Skeleton className="aspect-[5/3] w-full max-w-[520px] rounded-xl" />
						)}
					</div>

					<footer className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
						<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
						<span>
							Passive device — this preview may be newer than what&apos;s
							currently on the screen.
						</span>
					</footer>
				</section>

				{/* Fleet panel: stats + lists */}
				<section className="flex flex-col overflow-hidden rounded-2xl border bg-card">
					<header className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
						<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Fleet
						</h3>
						<span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
							{processedDevices.length}
						</span>
					</header>

					<div className="grid grid-cols-3 divide-x border-b">
						<Stat label="Total" value={processedDevices.length} />
						<Stat label="Online" value={onlineDevices.length} accent="online" />
						<Stat
							label="Offline"
							value={offlineDevices.length}
							accent="offline"
						/>
					</div>

					<div className="grid flex-1 grid-cols-2 divide-x">
						<DeviceColumn
							title="Online"
							emptyLabel="No devices online"
							devices={onlineDevices}
						/>
						<DeviceColumn
							title="Offline"
							emptyLabel="No devices offline"
							devices={offlineDevices}
						/>
					</div>
				</section>
			</div>

			<RecentSystemLogs systemLogs={systemLogs} />
		</div>
	);
}

function Stat({
	label,
	value,
	accent,
}: {
	label: string;
	value: number;
	accent?: "online" | "offline";
}) {
	return (
		<div className="flex flex-col gap-0.5 px-4 py-3">
			<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<div className="flex items-baseline gap-2">
				<span
					className={cn(
						"text-2xl font-bold tabular-nums tracking-tight",
						accent === "online" && "text-green-600 dark:text-green-400",
						accent === "offline" && "text-muted-foreground",
					)}
				>
					{value}
				</span>
				{accent && (
					<StatusIndicator
						status={accent === "online" ? "online" : "offline"}
						size="sm"
					/>
				)}
			</div>
		</div>
	);
}

function DeviceColumn({
	title,
	emptyLabel,
	devices,
}: {
	title: string;
	emptyLabel: string;
	devices: Array<Device & { status: "online" | "offline" }>;
}) {
	return (
		<div className="flex flex-col gap-1 p-3">
			<div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				{title}
			</div>
			<div
				className="space-y-1 overflow-y-auto"
				style={{ scrollbarWidth: "thin", maxHeight: 140 }}
			>
				{devices.length > 0 ? (
					devices.map((device) => (
						<Link
							key={device.id}
							href={`/device/${device.friendly_id}`}
							className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
						>
							<div className="flex min-w-0 items-center gap-2">
								<StatusIndicator status={device.status} size="sm" />
								<span className="truncate text-sm group-hover:text-primary">
									{device.name}
								</span>
							</div>
							<span
								className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
								suppressHydrationWarning
							>
								{formatDate(device.last_update_time)}
							</span>
						</Link>
					))
				) : (
					<div className="px-2 py-1.5 text-xs text-muted-foreground">
						{emptyLabel}
					</div>
				)}
			</div>
		</div>
	);
}
