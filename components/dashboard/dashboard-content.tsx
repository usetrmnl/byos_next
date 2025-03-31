"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { Device, SystemLog } from "@/lib/supabase/types";
import { formatDate, getDeviceStatus } from "@/utils/helpers";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

interface DashboardContentProps {
	devices: Device[];
	systemLogs: SystemLog[];
	hostUrl: string;
}

export const DashboardContent = ({
	devices,
	systemLogs,
	hostUrl,
}: DashboardContentProps) => {
	// Process devices data
	const processedDevices = devices.map((device) => ({
		...device,
		status: getDeviceStatus(device),
	}));

	const onlineDevices = processedDevices.filter((d) => d.status === "online");
	const offlineDevices = processedDevices.filter((d) => d.status === "offline");

	// Get the most recently updated device
	const lastUpdatedDevice =
		processedDevices.length > 0
			? processedDevices.sort(
					(a, b) =>
						new Date(b.last_update_time || "").getTime() -
						new Date(a.last_update_time || "").getTime(),
				)[0]
			: null;

	return (
		<>
			<div className="grid gap-2 md:gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Latest Screen</CardTitle>
						<CardDescription suppressHydrationWarning>
							{lastUpdatedDevice
								? `Most recent screen, requested by ${lastUpdatedDevice?.name} (${lastUpdatedDevice?.friendly_id}) ${formatDate(lastUpdatedDevice?.last_update_time)}`
								: "No devices available"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{lastUpdatedDevice ? (
							<>
								<div className="relative rounded-xs overflow-hidden bg-muted flex items-center justify-center border">
									<picture>
										<img
											src={`/api/bitmap/${lastUpdatedDevice?.screen}.bmp`}
											alt="Bitmap"
											width={800}
											height={480}
											className="antialiased"
											style={{ imageRendering: "pixelated" }}
											suppressHydrationWarning
										/>
									</picture>
								</div>
								<div className="text-xs text-amber-500 dark:text-amber-500/50 mt-2">
									Warning: due to the passive nature of the device, the screen
									shown here might be newer than the actual screen
								</div>
							</>
						) : (
							<div className="flex flex-col space-y-3">
								<Skeleton className="h-[240px] w-full rounded-md" />
								<div className="flex justify-end">
									<Skeleton className="h-4 w-[200px]" />
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<div className="grid grid-rows-2 gap-2 md:gap-4">
					<Card>
						<CardHeader>
							<CardTitle>System Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Host URL:</span>
									<span className="text-sm text-muted-foreground">
										<a href={hostUrl}>{hostUrl}</a>
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Total Devices:</span>
									<span className="text-sm text-muted-foreground">
										{processedDevices.length}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Online Devices:</span>
									<span className="text-sm text-muted-foreground">
										{onlineDevices.length}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Offline Devices:</span>
									<span className="text-sm text-muted-foreground">
										{offlineDevices.length}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>System Status</CardTitle>
							<CardDescription>
								Overview of all connected devices
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h3 className="text-sm font-medium mb-2">Online Devices</h3>
									<div
										className="space-y-2 max-h-[100px] overflow-y-auto"
										style={{ scrollbarWidth: "thin" }}
									>
										{onlineDevices.length > 0 ? (
											onlineDevices.map((device) => (
												<div
													key={device.id}
													className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
												>
													<div className="flex items-center gap-2">
														<StatusIndicator status="online" size="md" />
														<Link
															href={`/device/${device.friendly_id}`}
															className="text-sm"
														>
															{device.name}
														</Link>
													</div>
													<span
														className="text-xs text-muted-foreground"
														suppressHydrationWarning
													>
														{formatDate(device.last_update_time)}
													</span>
												</div>
											))
										) : (
											<div className="text-muted-foreground text-sm">
												No devices are online
											</div>
										)}
									</div>
								</div>
								<div>
									<h3 className="text-sm font-medium mb-2">Offline Devices</h3>
									<div
										className="space-y-2 max-h-[100px] overflow-y-auto"
										style={{ scrollbarWidth: "thin" }}
									>
										{offlineDevices.length > 0 ? (
											offlineDevices.map((device) => (
												<div
													key={device.id}
													className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
												>
													<div className="flex items-center gap-2">
														<StatusIndicator status="offline" size="md" />
														<Link
															href={`/device/${device.friendly_id}`}
															className="text-sm"
														>
															{device.name}
														</Link>
													</div>
													<span
														className="text-xs text-muted-foreground"
														suppressHydrationWarning
													>
														{formatDate(device.last_update_time)}
													</span>
												</div>
											))
										) : (
											<div className="text-muted-foreground text-sm">
												No devices are offline
											</div>
										)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card className="mt-2 md:mt-4 gap-4">
				<CardHeader>
					<CardTitle>Recent System Logs</CardTitle>
					<CardDescription>
						Latest system events and alerts. &nbsp;
						<Link
							href="/system-logs"
							className="text-blue-500 hover:underline flex items-center gap-1"
						>
							<span>See all system logs</span>{" "}
							<ArrowRightIcon className="w-4 h-4" />
						</Link>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[80px]">Time</TableHead>
								<TableHead className="w-[40px]">Level</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Message</TableHead>
								<TableHead className="max-w-[200px]">Metadata</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{systemLogs.length > 0 ? (
								systemLogs.map((log: SystemLog, index: number) => {
									const prevLog = index > 0 ? systemLogs[index - 1] : null;
									// Check if we should show time based on time difference with previous log
									const shouldTimeBeShown =
										index === 0 ||
										(prevLog &&
											Math.abs(
												new Date(log.created_at || "").getTime() -
													new Date(prevLog.created_at || "").getTime(),
											) /
												1000 >=
												3);
									// Check if we should show level based on level difference with previous log or time difference
									const shouldLevelBeShown =
										index === 0 ||
										(prevLog && prevLog.level !== log.level) ||
										(prevLog &&
											Math.abs(
												new Date(log.created_at || "").getTime() -
													new Date(prevLog.created_at || "").getTime(),
											) /
												1000 >=
												3);

									return (
										<TableRow key={log.id}>
											<TableCell suppressHydrationWarning>
												{shouldTimeBeShown ? formatDate(log.created_at) : ""}
											</TableCell>
											<TableCell>
												{shouldLevelBeShown ? (
													<Badge
														variant="outline"
														className={`
                              ${log.level === "error" ? "bg-red-100 text-red-800 border-red-200" : ""}
                              ${log.level === "warning" ? "bg-amber-100 text-amber-800 border-amber-200" : ""}
                              ${log.level === "info" ? "bg-blue-100 text-blue-800 border-blue-200" : ""}
                              ${log.level === "debug" ? "bg-gray-100 text-gray-800 border-gray-200" : ""}
                            `}
													>
														{log.level}
													</Badge>
												) : (
													""
												)}
											</TableCell>
											<TableCell>{log.source || "-"}</TableCell>
											<TableCell>{log.message}</TableCell>
											<TableCell className="max-w-[200px] truncate">
												{log.metadata}
											</TableCell>
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell colSpan={5} className="h-32 text-center">
										<p className="text-muted-foreground text-sm">
											No system logs to be shown
										</p>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<div className="flex justify-center mt-4">
						Showing the latest {systemLogs.length} system logs. &nbsp;
						<Link
							href="/system-logs"
							className="text-blue-500 hover:underline flex items-center gap-1"
						>
							<span>See all system logs</span>{" "}
							<ArrowRightIcon className="w-4 h-4" />
						</Link>
					</div>
				</CardContent>
			</Card>
		</>
	);
};
