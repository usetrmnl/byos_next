"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchDeviceSystemLogs } from "@/app/actions/system";
import SystemLogsViewer from "@/components/system-logs/system-logs-viewer";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Device } from "@/lib/types";
import DeviceLogsViewer from "./device-logs-viewer";

interface DeviceLogsContainerProps {
	device: Device;
}

export default function DeviceLogsContainer({
	device,
}: DeviceLogsContainerProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Get the active tab from URL or default to device-logs
	const activeTab = searchParams.get("activeTab") || "device-logs";

	// Handle tab change
	const handleTabChange = (value: string) => {
		const newSearchParams = new URLSearchParams(searchParams.toString());
		newSearchParams.set("activeTab", value);
		router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
	};

	return (
		<Card className="mt-6 overflow-x-scroll">
			<CardHeader>
				<CardTitle className="text-base">Device Logs</CardTitle>
				<CardDescription className="text-xs">
					View logs and events for this device
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs value={activeTab} onValueChange={handleTabChange}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="device-logs">Device Logs</TabsTrigger>
						<TabsTrigger value="system-logs">System Logs</TabsTrigger>
					</TabsList>
					<div className="mt-4">
						<TabsContent value="device-logs" className="mt-0">
							<DeviceLogsViewer
								friendlyId={device.friendly_id}
								paramPrefix="device_"
							/>
						</TabsContent>
						<TabsContent value="system-logs" className="mt-0">
							{/* Custom SystemLogsViewer that filters for this device */}
							<SystemLogsViewerWithDeviceFilter
								friendlyId={device.friendly_id}
								macAddress={device.mac_address}
								apiKey={device.api_key}
								paramPrefix="system_"
							/>
						</TabsContent>
					</div>
				</Tabs>
			</CardContent>
		</Card>
	);
}

// Custom SystemLogsViewer that filters for a specific device
interface SystemLogsViewerWithDeviceFilterProps {
	friendlyId: string;
	macAddress: string;
	apiKey: string;
	paramPrefix: string;
}

function SystemLogsViewerWithDeviceFilter({
	friendlyId,
	macAddress,
	apiKey,
	paramPrefix,
}: SystemLogsViewerWithDeviceFilterProps) {
	// This is a wrapper around the SystemLogsViewer that pre-filters for this device
	// We're using the existing SystemLogsViewer component but with custom fetch logic

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground mb-4">
				Showing system logs related to device {friendlyId}
			</p>
			<SystemLogsViewer
				customFetchFunction={async (params) => {
					return fetchDeviceSystemLogs({
						...params,
						friendlyId,
						macAddress,
						apiKey,
					});
				}}
				paramPrefix={paramPrefix}
			/>
		</div>
	);
}
