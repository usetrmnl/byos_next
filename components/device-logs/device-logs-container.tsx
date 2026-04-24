"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchDeviceSystemLogs } from "@/app/actions/system";
import SystemLogsViewer from "@/components/system-logs/system-logs-viewer";
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
	const pathname = usePathname() ?? "/";
	const searchParams = useSearchParams();

	// Get the active tab from URL or default to device-logs
	const activeTab = searchParams?.get("activeTab") || "device-logs";

	// Handle tab change
	const handleTabChange = (value: string) => {
		const newSearchParams = new URLSearchParams(searchParams?.toString());
		newSearchParams.set("activeTab", value);
		router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
	};

	return (
		<section className="overflow-hidden rounded-2xl border bg-card">
			<div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
				<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					Device logs
				</h3>
			</div>
			<Tabs value={activeTab} onValueChange={handleTabChange} className="p-4">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="device-logs">Device logs</TabsTrigger>
					<TabsTrigger value="system-logs">System logs</TabsTrigger>
				</TabsList>
				<div className="mt-4">
					<TabsContent value="device-logs" className="mt-0">
						<DeviceLogsViewer
							friendlyId={device.friendly_id}
							paramPrefix="device_"
						/>
					</TabsContent>
					<TabsContent value="system-logs" className="mt-0">
						<SystemLogsViewerWithDeviceFilter
							friendlyId={device.friendly_id}
							macAddress={device.mac_address}
							apiKey={device.api_key}
							paramPrefix="system_"
						/>
					</TabsContent>
				</div>
			</Tabs>
		</section>
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
