"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DeviceFrame } from "@/components/common/device-frame";
import { StatusIndicator } from "@/components/common/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Device, SystemLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate, getDeviceStatus } from "@/utils/helpers";

interface DashboardClientPageProps {
	devices: Device[];
	systemLogs: SystemLog[];
}

export default function DashboardClientPage({
	devices,
	systemLogs,
}: DashboardClientPageProps) {
	const processedDevices = devices.map((device) => ({
		...device,
		status: getDeviceStatus(device),
	}));

	const onlineDevices = processedDevices.filter((d) => d.status === "online");
	const offlineDevices = processedDevices.filter((d) => d.status === "offline");

	const lastUpdatedDevice =
		processedDevices.length > 0
			? processedDevices.sort(
					(a, b) =>
						new Date(b.last_update_time || "").getTime() -
						new Date(a.last_update_time || "").getTime(),
				)[0]
			: null;

	const isPortrait = lastUpdatedDevice?.screen_orientation === "portrait";
	const deviceWidth = isPortrait
		? lastUpdatedDevice?.screen_height || DEFAULT_IMAGE_HEIGHT
		: lastUpdatedDevice?.screen_width || DEFAULT_IMAGE_WIDTH;
	const deviceHeight = isPortrait
		? lastUpdatedDevice?.screen_width || DEFAULT_IMAGE_WIDTH
		: lastUpdatedDevice?.screen_height || DEFAULT_IMAGE_HEIGHT;

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
								<DeviceFrame size="lg" portrait={isPortrait}>
									<Image
										src={`/api/bitmap/${lastUpdatedDevice.screen}.bmp?width=${deviceWidth}&height=${deviceHeight}`}
										alt={`${lastUpdatedDevice.name} screen`}
										fill
										className="absolute inset-0 h-full w-full object-cover"
										style={{ imageRendering: "pixelated" }}
										unoptimized
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

			{/* System logs */}
			<section className="overflow-hidden rounded-2xl border bg-card">
				<header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
					<div className="flex items-center gap-2">
						<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Recent system logs
						</h3>
						<span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
							{systemLogs.length}
						</span>
					</div>
					<Link
						href="/system-logs"
						className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
					>
						See all
						<ArrowRight className="h-3.5 w-3.5" />
					</Link>
				</header>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[80px]">Time</TableHead>
								<TableHead className="w-[80px]">Level</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Message</TableHead>
								<TableHead className="max-w-[220px]">Metadata</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{systemLogs.length > 0 ? (
								systemLogs.map((log, index) => {
									const prevLog = index > 0 ? systemLogs[index - 1] : null;
									const diffSec =
										prevLog &&
										Math.abs(
											new Date(log.created_at || "").getTime() -
												new Date(prevLog.created_at || "").getTime(),
										) / 1000;
									const showTime = index === 0 || (diffSec && diffSec >= 3);
									const showLevel =
										index === 0 ||
										(prevLog && prevLog.level !== log.level) ||
										(diffSec && diffSec >= 3);

									return (
										<TableRow key={log.id}>
											<TableCell
												className="text-xs tabular-nums text-muted-foreground"
												suppressHydrationWarning
											>
												{showTime ? formatDate(log.created_at) : ""}
											</TableCell>
											<TableCell>
												{showLevel ? <LevelBadge level={log.level} /> : ""}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{log.source || "—"}
											</TableCell>
											<TableCell className="text-sm">{log.message}</TableCell>
											<TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
												{log.metadata}
											</TableCell>
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-32 text-center text-sm text-muted-foreground"
									>
										No system logs to show
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</section>
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

function LevelBadge({ level }: { level: SystemLog["level"] }) {
	const styles: Record<NonNullable<SystemLog["level"]>, string> = {
		error: "bg-destructive/10 text-destructive border-destructive/20",
		warning:
			"bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
		info: "bg-primary/10 text-primary border-primary/20",
		debug: "bg-muted text-muted-foreground border-border",
	};
	if (!level) return null;
	return (
		<Badge
			variant="outline"
			className={cn("text-[10px] uppercase tracking-wider", styles[level])}
		>
			{level}
		</Badge>
	);
}
