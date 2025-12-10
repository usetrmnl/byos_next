"use client";

import { RefreshCw, Search } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Device, Mixup, Playlist } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTimezone, timezones } from "@/utils/helpers";

// Device size presets
const DEVICE_SIZE_PRESETS = {
	"800x480": { width: 800, height: 480 },
	"1872x1404": { width: 1872, height: 1404 },
	custom: null,
} as const;

type DeviceSizePreset = keyof typeof DEVICE_SIZE_PRESETS;

interface DeviceEditFormProps {
	editedDevice: Device & { status?: string; type?: string };
	availableScreens: { id: string; title: string }[];
	availablePlaylists: Playlist[];
	availableMixups: Mixup[];
	deviceSizePreset: DeviceSizePreset;
	apiKeyError: string | null;
	friendlyIdError: string | null;
	isSaving: boolean;
	onInputChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void;
	onNestedInputChange: (path: string, value: string) => void;
	onSelectChange: (name: string, value: string) => void;
	onScreenChange: (screenId: string | null) => void;
	onDeviceSizePresetChange: (preset: DeviceSizePreset) => void;
	onCustomSizeChange: (field: "width" | "height", value: number) => void;
	onRegenerateApiKey: () => void;
	onRegenerateFriendlyId: () => void;
	onAddTimeRange: () => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
}

// Map grayscale value to number of gray levels (2, 4, or 16)
const getGrayscaleLevels = (grayscale: number | null | undefined): number => {
	if (grayscale === 2 || grayscale === 4 || grayscale === 16) {
		return grayscale;
	}
	return 2; // Default to 2 levels (black/white)
};

export default function DeviceEditForm({
	editedDevice,
	availableScreens,
	availablePlaylists,
	availableMixups,
	deviceSizePreset,
	apiKeyError,
	friendlyIdError,
	isSaving,
	onInputChange,
	onNestedInputChange,
	onSelectChange,
	onScreenChange,
	onDeviceSizePresetChange,
	onCustomSizeChange,
	onRegenerateApiKey,
	onRegenerateFriendlyId,
	onAddTimeRange,
	onSubmit,
	onCancel,
}: DeviceEditFormProps) {
	const orientation = editedDevice.screen_orientation || "landscape";
	const deviceWidth =
		orientation === "landscape"
			? editedDevice.screen_width || DEFAULT_IMAGE_WIDTH
			: editedDevice.screen_height || DEFAULT_IMAGE_HEIGHT;
	const deviceHeight =
		orientation === "landscape"
			? editedDevice.screen_height || DEFAULT_IMAGE_HEIGHT
			: editedDevice.screen_width || DEFAULT_IMAGE_WIDTH;

	const editedGrayscaleLevels = getGrayscaleLevels(editedDevice.grayscale);

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="text-base">Edit Device Information</CardTitle>
				<CardDescription className="text-xs">
					Update device details and configuration
				</CardDescription>
			</CardHeader>
			<form onSubmit={onSubmit}>
				<CardContent className="space-y-6">
					<div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
						<Tabs defaultValue="essentials" className="w-full">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="text-sm font-medium">Device setup</p>
									<p className="text-xs text-muted-foreground">
										Group controls by focus area and move faster with quick
										tabs.
									</p>
								</div>
								<TabsList>
									<TabsTrigger value="essentials">Essentials</TabsTrigger>
									<TabsTrigger value="content">Content</TabsTrigger>
									<TabsTrigger value="display">Display</TabsTrigger>
									<TabsTrigger value="refresh">Refresh</TabsTrigger>
								</TabsList>
							</div>

							<TabsContent value="essentials" className="space-y-4">
								<div className="rounded-lg border bg-muted/30 p-4 space-y-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="name">Device Name</Label>
											<Input
												id="name"
												name="name"
												value={editedDevice?.name || ""}
												onChange={onInputChange}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="mac_address">MAC Address</Label>
											<Input
												id="mac_address"
												name="mac_address"
												value={editedDevice?.mac_address || ""}
												onChange={onInputChange}
											/>
										</div>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="friendly_id">Friendly ID</Label>
											<div className="flex gap-2">
												<Input
													id="friendly_id"
													name="friendly_id"
													value={editedDevice?.friendly_id || ""}
													onChange={onInputChange}
													className="font-mono"
												/>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={onRegenerateFriendlyId}
													title="Generate new Friendly ID"
												>
													<RefreshCw className="h-4 w-4" />
												</Button>
											</div>
											{friendlyIdError && (
												<p className="text-red-500">{friendlyIdError}</p>
											)}
										</div>
										<div className="space-y-2">
											<Label htmlFor="api_key">API Key</Label>
											<div className="flex gap-2">
												<Input
													id="api_key"
													name="api_key"
													value={editedDevice?.api_key || ""}
													onChange={onInputChange}
													className="font-mono"
												/>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={onRegenerateApiKey}
													title="Generate new API Key"
												>
													<RefreshCw className="h-4 w-4" />
												</Button>
											</div>
											{apiKeyError && (
												<p className="text-red-500">{apiKeyError}</p>
											)}
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="timezone">Timezone</Label>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className="w-full justify-between"
												>
													{editedDevice?.timezone
														? formatTimezone(editedDevice.timezone)
														: "Select timezone..."}
													<Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[300px] p-0">
												<Command>
													<CommandInput placeholder="Search timezone..." />
													<CommandEmpty>No timezone found.</CommandEmpty>
													<CommandList>
														<ScrollArea className="h-[300px]">
															{[
																"Europe",
																"North America",
																"Asia",
																"Australia & Pacific",
															].map((region) => (
																<CommandGroup key={region} heading={region}>
																	{timezones
																		.filter(
																			(timezone) => timezone.region === region,
																		)
																		.map((timezone) => (
																			<CommandItem
																				key={timezone.value}
																				value={timezone.value}
																				onSelect={() => {
																					onSelectChange(
																						"timezone",
																						timezone.value,
																					);
																				}}
																				className="cursor-pointer"
																			>
																				<span
																					className={cn(
																						"mr-2",
																						editedDevice?.timezone ===
																							timezone.value
																							? "font-medium"
																							: "",
																					)}
																				>
																					{timezone.label}
																				</span>
																			</CommandItem>
																		))}
																</CommandGroup>
															))}
														</ScrollArea>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="content" className="space-y-4">
								<div className="rounded-lg border p-4 space-y-4">
									<div className="space-y-2">
										<Label>Display Mode</Label>
										<ToggleGroup
											type="single"
											variant="outline"
											value={editedDevice.display_mode}
											onValueChange={(value) => {
												if (value) {
													onSelectChange(
														"display_mode",
														value as DeviceDisplayMode,
													);
												}
											}}
											className="flex flex-wrap items-center"
										>
											<ToggleGroupItem value={DeviceDisplayMode.SCREEN}>
												Single Screen
											</ToggleGroupItem>
											<ToggleGroupItem value={DeviceDisplayMode.PLAYLIST}>
												Playlist
											</ToggleGroupItem>
											<ToggleGroupItem value={DeviceDisplayMode.MIXUP}>
												Mixup
											</ToggleGroupItem>
										</ToggleGroup>
										<p className="text-xs text-muted-foreground">
											Choose what the device renders and connect it to
											playlists, screens, or a mixup.
										</p>
									</div>

									{editedDevice.display_mode === DeviceDisplayMode.PLAYLIST && (
										<div className="space-y-2">
											<Label htmlFor="playlist">Playlist</Label>
											<Select
												value={editedDevice?.playlist_id || ""}
												onValueChange={(value) =>
													onSelectChange(
														"playlist_id",
														value === "none" ? "" : value,
													)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select playlist..." />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{availablePlaylists.map((playlist) => (
														<SelectItem key={playlist.id} value={playlist.id}>
															{playlist.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}

									{editedDevice.display_mode === DeviceDisplayMode.MIXUP && (
										<div className="space-y-2">
											<Label htmlFor="mixup">Mixup</Label>
											<Select
												value={editedDevice?.mixup_id || ""}
												onValueChange={(value) =>
													onSelectChange(
														"mixup_id",
														value === "none" ? "" : value,
													)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select mixup..." />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{availableMixups.map((mixup) => (
														<SelectItem key={mixup.id} value={mixup.id}>
															{mixup.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-sm text-muted-foreground">
												A mixup combines multiple recipes into a single
												split-screen layout.
											</p>
										</div>
									)}

									{editedDevice.display_mode === DeviceDisplayMode.SCREEN && (
										<div className="space-y-2">
											<Label htmlFor="screen">Screen Component</Label>
											<Select
												value={editedDevice?.screen || ""}
												onValueChange={(value) =>
													onScreenChange(value === "none" ? null : value)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select screen..." />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">
														None (Use default)
													</SelectItem>
													{availableScreens.map((screen) => (
														<SelectItem key={screen.id} value={screen.id}>
															{screen.title}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-sm text-muted-foreground">
												The screen component to display on this device. If not
												set, the default screen will be used.
											</p>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="display" className="space-y-4">
								<div className="rounded-lg border p-4 space-y-4">
									<div className="space-y-2">
										<Label htmlFor="device_size_preset">Device Size</Label>
										<Select
											value={deviceSizePreset}
											onValueChange={(value) =>
												onDeviceSizePresetChange(value as DeviceSizePreset)
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select device size..." />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="800x480">800x480</SelectItem>
												<SelectItem value="1872x1404">1872x1404</SelectItem>
												<SelectItem value="custom">Custom</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{deviceSizePreset === "custom" && (
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="screen_width">Width (px)</Label>
												<Input
													id="screen_width"
													name="screen_width"
													type="number"
													min="1"
													value={
														editedDevice?.screen_width || DEFAULT_IMAGE_WIDTH
													}
													onChange={(e) =>
														onCustomSizeChange(
															"width",
															Number.parseInt(e.target.value, 10) ||
																DEFAULT_IMAGE_WIDTH,
														)
													}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="screen_height">Height (px)</Label>
												<Input
													id="screen_height"
													name="screen_height"
													type="number"
													min="1"
													value={
														editedDevice?.screen_height || DEFAULT_IMAGE_HEIGHT
													}
													onChange={(e) =>
														onCustomSizeChange(
															"height",
															Number.parseInt(e.target.value, 10) ||
																DEFAULT_IMAGE_HEIGHT,
														)
													}
												/>
											</div>
										</div>
									)}

									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="screen_orientation">Orientation</Label>
											<Select
												value={editedDevice?.screen_orientation || "landscape"}
												onValueChange={(value) =>
													onSelectChange("screen_orientation", value)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select orientation..." />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="landscape">Landscape</SelectItem>
													<SelectItem value="portrait">Portrait</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Grayscale Levels</Label>
											<ToggleGroup
												type="single"
												value={String(editedGrayscaleLevels)}
												onValueChange={(value) => {
													if (value) {
														onSelectChange("grayscale", value);
													}
												}}
												variant="outline"
												spacing={0}
												className="w-fit"
											>
												<ToggleGroupItem value="2" className="flex-1">
													2
												</ToggleGroupItem>
												<ToggleGroupItem value="4" className="flex-1">
													4
												</ToggleGroupItem>
												<ToggleGroupItem value="16" className="flex-1">
													16
												</ToggleGroupItem>
											</ToggleGroup>
											<p className="text-xs text-muted-foreground">
												Number of gray levels for image rendering
											</p>
										</div>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="refresh" className="space-y-4">
								<div className="rounded-lg border p-4 space-y-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="refresh_schedule.default_refresh_rate">
												Default Refresh Rate (seconds)
											</Label>
											<Input
												id="refresh_schedule.default_refresh_rate"
												name="refresh_schedule.default_refresh_rate"
												type="number"
												value={
													editedDevice?.refresh_schedule
														?.default_refresh_rate || 300
												}
												onChange={onInputChange}
											/>
										</div>
										<div className="space-y-2">
											<Label className="text-xs">Scheduling timezone</Label>
											<p className="text-sm text-muted-foreground">
												Schedule respects the timezone set in Essentials.
											</p>
										</div>
									</div>

									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<div>
												<h3 className="text-sm font-medium">
													Refresh Schedule Time Ranges
												</h3>
												<p className="text-xs text-muted-foreground">
													Override the default rate for specific windows.
												</p>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={onAddTimeRange}
											>
												Add Time Range
											</Button>
										</div>

										{editedDevice?.refresh_schedule?.time_ranges?.map(
											(range, index) => (
												<div
													key={index}
													className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3"
												>
													<div className="space-y-1">
														<Label
															htmlFor={`start_time_${index}`}
															className="text-xs"
														>
															Start Time
														</Label>
														<Input
															id={`start_time_${index}`}
															name={`start_time_${index}`}
															value={range.start_time}
															onChange={(e) =>
																onNestedInputChange(
																	`refresh_schedule.time_ranges.${index}.start_time`,
																	e.target.value,
																)
															}
														/>
													</div>
													<div className="space-y-1">
														<Label
															htmlFor={`end_time_${index}`}
															className="text-xs"
														>
															End Time
														</Label>
														<Input
															id={`end_time_${index}`}
															name={`end_time_${index}`}
															value={range.end_time}
															onChange={(e) =>
																onNestedInputChange(
																	`refresh_schedule.time_ranges.${index}.end_time`,
																	e.target.value,
																)
															}
														/>
													</div>
													<div className="space-y-1">
														<Label
															htmlFor={`refresh_rate_${index}`}
															className="text-xs"
														>
															Refresh Rate (seconds)
														</Label>
														<Input
															id={`refresh_rate_${index}`}
															name={`refresh_schedule.time_ranges.${index}.refresh_rate`}
															type="number"
															value={range.refresh_rate}
															onChange={(e) =>
																onNestedInputChange(
																	`refresh_schedule.time_ranges.${index}.refresh_rate`,
																	e.target.value,
																)
															}
														/>
													</div>
												</div>
											),
										)}

										{(!editedDevice?.refresh_schedule?.time_ranges ||
											editedDevice.refresh_schedule.time_ranges.length ===
												0) && (
											<p className="text-sm text-muted-foreground">
												No custom time ranges configured.
											</p>
										)}
									</div>
								</div>
							</TabsContent>
						</Tabs>

						<div className="space-y-4 rounded-lg border p-4 lg:sticky lg:top-4 h-fit">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium">Live Preview</p>
									<p className="text-xs text-muted-foreground">
										Renders using your current mode and sizing.
									</p>
								</div>
								<div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
									<span>
										{deviceWidth}×{deviceHeight}px
									</span>
									<span className="capitalize">{orientation}</span>
								</div>
							</div>
							<div className="w-full">
								{editedDevice.display_mode === DeviceDisplayMode.PLAYLIST &&
								editedDevice.playlist_id ? (
									<p className="text-sm text-muted-foreground mt-2">
										Playlist mode: Shows rotating screens based on playlist
										configuration
									</p>
								) : editedDevice.display_mode === DeviceDisplayMode.MIXUP &&
									editedDevice.mixup_id ? (
									<div
										className="max-w-[320px]"
										style={{
											maxHeight: `${(320 * deviceHeight) / deviceWidth}px`,
										}}
									>
										<AspectRatio ratio={deviceWidth / deviceHeight}>
											<Image
												src={`/api/bitmap/mixup/${editedDevice.mixup_id}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${editedGrayscaleLevels}`}
												alt="Mixup Preview"
												fill
												className="object-cover rounded-xs ring-2 ring-gray-200"
												style={{ imageRendering: "pixelated" }}
												unoptimized
											/>
										</AspectRatio>
									</div>
								) : (
									<div
										className="max-w-[320px]"
										style={{
											maxHeight: `${(320 * deviceHeight) / deviceWidth}px`,
										}}
									>
										<AspectRatio ratio={deviceWidth / deviceHeight}>
											<Image
												src={`/api/bitmap/${editedDevice?.screen || "simple-text"}.bmp?width=${deviceWidth}&height=${deviceHeight}&grayscale=${editedGrayscaleLevels}`}
												alt="Device Screen"
												fill
												className="object-cover rounded-xs ring-2 ring-gray-200"
												style={{ imageRendering: "pixelated" }}
												unoptimized
											/>
										</AspectRatio>
									</div>
								)}
							</div>
							<div className="text-xs text-muted-foreground space-y-2">
								<div className="flex items-center justify-between">
									<span>Mode</span>
									<span className="font-medium capitalize">
										{editedDevice.display_mode.toLowerCase()}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span>Timezone</span>
									<span className="font-medium">
										{editedDevice?.timezone
											? formatTimezone(editedDevice.timezone)
											: "Not set"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span>Default refresh</span>
									<span className="font-medium">
										{editedDevice?.refresh_schedule?.default_refresh_rate ||
											300}
										s
									</span>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex justify-end space-x-2 mt-2">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isSaving}>
						{isSaving ? (
							<>
								<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
