import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getInitData } from "@/lib/getInitData";
import screens from "@/app/recipes/screens.json";
import DevicePageClient from "@/components/device/device-page-client";
import { getDeviceStatus } from "@/utils/helpers";
import { Skeleton } from "@/components/ui/skeleton";

// Loading fallback for the device page
const DevicePageSkeleton = () => (
	<div className="space-y-6">
		<div className="flex items-center justify-between">
			<div className="space-y-1">
				<Skeleton className="h-8 w-64 rounded-md" />
				<Skeleton className="h-4 w-32 rounded-md" />
			</div>
			<div className="flex items-center gap-3">
				<Skeleton className="h-9 w-24 rounded-md" />
				<Skeleton className="h-9 w-24 rounded-md" />
			</div>
		</div>

		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			<Skeleton className="h-[400px] w-full rounded-md" />
			<div className="space-y-4">
				<Skeleton className="h-10 w-full rounded-md" />
				<Skeleton className="h-10 w-full rounded-md" />
				<Skeleton className="h-10 w-full rounded-md" />
				<Skeleton className="h-10 w-full rounded-md" />
			</div>
		</div>

		<Skeleton className="h-[300px] w-full rounded-md" />
	</div>
);

// Device data component that uses centralized cached data
const DeviceData = async ({ friendlyId }: { friendlyId: string }) => {
	const { devices } = await getInitData();

	// Find the specific device by friendly_id
	const device = devices.find((d) => d.friendly_id === friendlyId);

	if (!device) {
		return notFound();
	}

	// Enhance device with status
	const enhancedDevice = {
		...device,
		status: getDeviceStatus(device),
	};

	// Convert components to availableScreens array directly
	const availableScreens = Object.entries(screens).map(([id, config]) => ({
		id,
		title: config.title,
	}));

	return (
		<DevicePageClient
			initialDevice={enhancedDevice}
			availableScreens={availableScreens}
		/>
	);
};

export default async function DevicePage({
	params,
}: { params: Promise<{ friendly_id: string }> }) {
	const resolvedParams = await params;
	const friendlyId = resolvedParams.friendly_id as string;

	return (
		<Suspense fallback={<DevicePageSkeleton />}>
			<DeviceData friendlyId={friendlyId} />
		</Suspense>
	);
}
