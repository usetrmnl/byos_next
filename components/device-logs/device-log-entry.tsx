"use client";

import {
	AlertTriangle,
	BatteryCharging,
	Clock,
	Coffee,
	Cpu,
	FileCode,
	HardDrive,
	RefreshCw,
	Timer,
	Wifi,
	WifiOff,
} from "lucide-react";
import {
	type DeviceLogDisplayEntry,
	parseDeviceLogData,
} from "@/lib/device/log-display";
import type { Log } from "@/lib/types";

export function DeviceLogEntries({ log }: { log: Log & { type?: string } }) {
	return parseDeviceLogData(log.log_data, log.created_at).map(
		(entry, index) => (
			<DeviceStatusStamp key={`${log.id}-${index}`} entry={entry} />
		),
	);
}

function DeviceStatusStamp({ entry }: { entry: DeviceLogDisplayEntry }) {
	const { deviceStatusStamp, message, codeline, sourcefile, timestamp } = entry;
	const time = new Date(timestamp).toISOString().split("T")[1].split(".")[0];

	if (!deviceStatusStamp) {
		return (
			<div className="flex flex-col gap-2 py-1">
				<div className="flex items-start gap-2 pl-1 font-mono text-xs">
					<FileCode className="h-3.5 w-3.5" />
					<span>
						[{sourcefile}:{codeline}]
					</span>
					<Clock className="ml-1 h-3.5 w-3.5" />
					<span>{time}</span>
					<span className="flex items-center gap-1 break-words">
						{message.toLowerCase().includes("error") && (
							<AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-red-500" />
						)}
						{message}
					</span>
				</div>
			</div>
		);
	}

	const {
		wifi_rssi_level,
		wifi_status,
		battery_voltage,
		refresh_rate,
		free_heap_size,
		current_fw_version,
		wakeup_reason,
		time_since_last_sleep_start,
	} = deviceStatusStamp;
	const logType = message.toLowerCase().includes("error")
		? "error"
		: message.toLowerCase().includes("warn")
			? "warning"
			: "info";

	return (
		<div className="flex flex-col gap-2 py-1">
			<div className="flex flex-wrap items-center gap-3 text-xs">
				<div
					className="flex items-center gap-1 rounded-md bg-blue-400/10 px-2 py-1"
					title="WiFi Signal"
				>
					{wifi_status === "connected" && (
						<Wifi className="h-3.5 w-3.5 text-primary" />
					)}
					{wifi_status === "disconnected" && (
						<WifiOff className="h-3.5 w-3.5 text-red-500" />
					)}
					<span>{wifi_rssi_level || "N/A"} dBm</span>
				</div>

				<div
					className="flex items-center gap-1 rounded-md bg-green-400/10 px-2 py-1"
					title="Battery Voltage"
				>
					<BatteryCharging className="h-3.5 w-3.5 text-green-500" />
					<span>{battery_voltage ? battery_voltage.toFixed(2) : "N/A"} V</span>
				</div>

				{refresh_rate !== undefined && (
					<div
						className="flex items-center gap-1 rounded-md bg-purple-400/10 px-2 py-1"
						title="Refresh Rate"
					>
						<RefreshCw className="h-3.5 w-3.5 text-purple-500" />
						<span>{refresh_rate} s</span>
					</div>
				)}

				{free_heap_size !== undefined && (
					<div
						className="flex items-center gap-1 rounded-md bg-cyan-400/10 px-2 py-1"
						title="Free Heap Size"
					>
						<Cpu className="h-3.5 w-3.5 text-cyan-500" />
						<span>{free_heap_size} B</span>
					</div>
				)}

				{current_fw_version && (
					<div
						className="flex items-center gap-1 rounded-md bg-gray-400/10 px-2 py-1"
						title="Firmware Version"
					>
						<HardDrive className="h-3.5 w-3.5 text-gray-500" />
						<span>v{current_fw_version}</span>
					</div>
				)}

				{wakeup_reason && (
					<div
						className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1"
						title="Wakeup Reason"
					>
						<Coffee className="h-3.5 w-3.5 text-amber-500" />
						<span>{wakeup_reason}</span>
					</div>
				)}

				{time_since_last_sleep_start !== undefined && (
					<div
						className="flex items-center gap-1 rounded-md bg-indigo-400/10 px-2 py-1"
						title="Time Since Last Sleep"
					>
						<Timer className="h-3.5 w-3.5 text-indigo-500" />
						<span>{time_since_last_sleep_start}s</span>
					</div>
				)}
			</div>

			<div className="flex items-start gap-2 pl-1 font-mono text-xs">
				<FileCode className="h-3.5 w-3.5" />
				<span>
					[{sourcefile}:{codeline}]
				</span>
				<Clock className="ml-1 h-3.5 w-3.5" />
				<span>{time}</span>
				<span className="flex items-center gap-1 break-words">
					{logType === "error" && (
						<AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-red-500" />
					)}
					{message}
				</span>
			</div>
		</div>
	);
}
