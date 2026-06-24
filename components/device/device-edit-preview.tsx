"use client";

import { AlertTriangle } from "lucide-react";
import type React from "react";
import { DeviceBitmapImage } from "@/components/common/device-bitmap-image";
import { DeviceFrame } from "@/components/common/device-frame";
import { PanelHeader } from "@/components/common/panel-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UI_REFRESH_FALLBACK_SECONDS } from "@/lib/device/defaults";
import { getOrientedDeviceDimensions } from "@/lib/device/dimensions";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import { buildDevicePreviewSrc } from "@/lib/render/preview-image";
import type { TrmnlModel, TrmnlPalette } from "@/lib/trmnl/types";
import type { Device } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTimezone } from "@/utils/helpers";

export function DeviceEditPreview({
	editedDevice,
	selectedModel,
	selectedPalette,
	hasUnknownModel,
	savedModelName,
	playlistScreen,
}: {
	editedDevice: Device & { status?: string; type?: string };
	selectedModel?: TrmnlModel | null;
	selectedPalette?: TrmnlPalette;
	hasUnknownModel: boolean;
	savedModelName: string | null;
	playlistScreen?: string | null;
}) {
	const {
		width: deviceWidth,
		height: deviceHeight,
		isPortrait,
	} = getOrientedDeviceDimensions(editedDevice);
	const isMixup =
		editedDevice.display_mode === DeviceDisplayMode.MIXUP &&
		!!editedDevice.mixup_id;
	const isPlaylist =
		editedDevice.display_mode === DeviceDisplayMode.PLAYLIST &&
		!!editedDevice.playlist_id;
	const isScreenMissing = !editedDevice.screen && !isMixup && !isPlaylist;
	const heroSrc =
		selectedModel && !hasUnknownModel && !isScreenMissing
			? buildDevicePreviewSrc(editedDevice, {
					width: deviceWidth,
					height: deviceHeight,
					playlistScreen,
				})
			: null;

	return (
		<section className="flex flex-col overflow-hidden rounded-2xl border bg-card lg:sticky lg:top-4 lg:self-start">
			{hasUnknownModel && (
				<Alert className="rounded-none border-x-0 border-t-0 bg-muted/40 py-3 text-xs">
					<AlertTriangle />
					<AlertTitle>Unknown model</AlertTitle>
					<AlertDescription>
						Saved model <code className="font-mono">{savedModelName}</code>{" "}
						isn't in the local TRMNL registry. Pick a supported model in the
						Display tab to restore previews and device rendering.
					</AlertDescription>
				</Alert>
			)}
			{isScreenMissing && (
				<Alert className="rounded-none border-x-0 border-t-0 bg-muted/40 py-3 text-xs">
					<AlertTriangle />
					<AlertTitle>Screen not configured</AlertTitle>
					<AlertDescription>
						Select a screen in the Content tab to restore previews and device
						rendering.
					</AlertDescription>
				</Alert>
			)}
			<PanelHeader
				label="Live preview"
				right={
					<span className="text-[11px] tabular-nums text-muted-foreground">
						{deviceWidth}x{deviceHeight}px ·{" "}
						<span className="capitalize">
							{isPortrait ? "portrait" : "landscape"}
						</span>
						{selectedPalette ? ` · ${selectedPalette.name}` : ""}
					</span>
				}
			/>
			<div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_0%,theme(colors.muted/40),transparent_70%)] p-6">
				{!heroSrc ? (
					<div className="max-w-sm text-center text-sm text-muted-foreground">
						Preview unavailable until the display configuration is complete.
					</div>
				) : (
					<div
						className={cn(
							"w-full",
							isPortrait ? "max-w-[260px]" : "max-w-[520px]",
						)}
					>
						<DeviceFrame
							size="lg"
							portrait={isPortrait}
							screenAspectRatio={`${deviceWidth} / ${deviceHeight}`}
						>
							<DeviceBitmapImage src={heroSrc} alt="Device screen preview" />
						</DeviceFrame>
					</div>
				)}
			</div>
			<div className="border-t bg-muted/20 px-4 py-3 text-xs">
				<div className="grid gap-1.5 sm:grid-cols-3">
					<MetaRow label="Mode">
						<span className="capitalize">
							{editedDevice.display_mode.toLowerCase()}
						</span>
					</MetaRow>
					<MetaRow label="Timezone">
						{editedDevice?.timezone
							? formatTimezone(editedDevice.timezone)
							: "—"}
					</MetaRow>
					<MetaRow label="Refresh">
						{editedDevice?.refresh_schedule?.default_refresh_rate ||
							UI_REFRESH_FALLBACK_SECONDS}
						s
					</MetaRow>
				</div>
			</div>
		</section>
	);
}

function MetaRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<span className="truncate text-sm font-medium">{children}</span>
		</div>
	);
}
