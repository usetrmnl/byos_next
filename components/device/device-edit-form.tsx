"use client";

import { RefreshCw, Search, Trash2 } from "lucide-react";
import type React from "react";
import { type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
import {
	DEFAULT_DEVICE_SCREEN,
	UI_REFRESH_FALLBACK_SECONDS,
} from "@/lib/device/defaults";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import { getFirstPlaylistScreenId } from "@/lib/playlists/playlist-items";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { type DeviceSizePreset } from "@/lib/trmnl/device-presets";
import { resolveDeviceProfileFromCatalog } from "@/lib/trmnl/device-profile-client";
import type { TrmnlModel, TrmnlPalette } from "@/lib/trmnl/types";
import type { Device, Mixup, Playlist, PlaylistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTimezone, timezones } from "@/utils/helpers";
import { DeviceEditPreview } from "./device-edit-preview";

interface DeviceEditFormProps {
	editedDevice: Device & { status?: string; type?: string };
	availableScreens: { id: string; title: string }[];
	availablePlaylists: Playlist[];
	playlistItems: PlaylistItem[];
	availableMixups: Mixup[];
	trmnlModels: TrmnlModel[];
	trmnlPalettes: TrmnlPalette[];
	deviceSizePreset: DeviceSizePreset;
	apiKeyError: string | null;
	friendlyIdError: string | null;
	isSaving: boolean;
	onInputChange: (
		e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) => void;
	onNestedInputChange: (path: string, value: string) => void;
	onSelectChange: (name: string, value: string) => void;
	onScreenChange: (screenId: string | null) => void;
	onDeviceSizePresetChange: (preset: DeviceSizePreset) => void;
	onCustomSizeChange: (field: "width" | "height", value: number) => void;
	onRegenerateApiKey: () => void;
	onRegenerateFriendlyId: () => void;
	onAddTimeRange: () => void;
	onRemoveTimeRange: (index: number) => void;
	onSubmit: (e: React.SubmitEvent) => void;
	onCancel: () => void;
}

export default function DeviceEditForm({
	editedDevice,
	availableScreens,
	availablePlaylists,
	playlistItems,
	availableMixups,
	trmnlModels,
	trmnlPalettes,
	deviceSizePreset,
	apiKeyError,
	friendlyIdError,
	isSaving: _isSaving,
	onInputChange,
	onNestedInputChange,
	onSelectChange,
	onScreenChange,
	onDeviceSizePresetChange,
	onCustomSizeChange,
	onRegenerateApiKey,
	onRegenerateFriendlyId,
	onAddTimeRange,
	onRemoveTimeRange,
	onSubmit,
	onCancel: _onCancel,
}: DeviceEditFormProps) {
	const {
		savedModelName,
		selectedModel,
		selectedPalette,
		selectedPaletteIds,
		hasUnknownModel,
	} = resolveDeviceProfileFromCatalog({
		modelName: editedDevice.model,
		paletteId: editedDevice.palette_id,
		models: trmnlModels,
		palettes: trmnlPalettes,
	});

	return (
		<form onSubmit={onSubmit}>
			<div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
				<DeviceEditPreview
					editedDevice={editedDevice}
					selectedModel={selectedModel}
					selectedPalette={selectedPalette}
					hasUnknownModel={hasUnknownModel}
					savedModelName={savedModelName}
					playlistScreen={getFirstPlaylistScreenId(
						playlistItems,
						editedDevice.playlist_id,
					)}
				/>

				{/* Form — right column with tabs */}
				<section className="overflow-hidden rounded-2xl border bg-card">
					<div className="border-b bg-muted/30 px-4 py-2">
						<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Configuration
						</h3>
					</div>
					<Tabs defaultValue="essentials" className="p-4">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="essentials">Essentials</TabsTrigger>
							<TabsTrigger value="content">Content</TabsTrigger>
							<TabsTrigger value="display">Display</TabsTrigger>
							<TabsTrigger value="refresh">Refresh</TabsTrigger>
						</TabsList>

						<TabsContent value="essentials" className="mt-4 space-y-4">
							<Field label="Device name" htmlFor="name">
								<Input
									id="name"
									name="name"
									value={editedDevice?.name || ""}
									onChange={onInputChange}
								/>
							</Field>
							<Field label="MAC address" htmlFor="mac_address">
								<Input
									id="mac_address"
									name="mac_address"
									value={editedDevice?.mac_address || ""}
									onChange={onInputChange}
									className="font-mono text-sm"
								/>
							</Field>
							<Field
								label="Friendly ID"
								htmlFor="friendly_id"
								error={friendlyIdError}
							>
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
							</Field>
							<Field label="API key" htmlFor="api_key" error={apiKeyError}>
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
										title="Generate new API key"
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</div>
							</Field>
							<Field label="Timezone" htmlFor="timezone">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full justify-between font-normal"
										>
											{editedDevice?.timezone
												? formatTimezone(editedDevice.timezone)
												: "Select timezone…"}
											<Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-[300px] p-0">
										<Command>
											<CommandInput placeholder="Search timezone…" />
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
																.filter((tz) => tz.region === region)
																.map((tz) => (
																	<CommandItem
																		key={tz.value}
																		value={tz.value}
																		keywords={[tz.label, tz.region]}
																		onSelect={() =>
																			onSelectChange("timezone", tz.value)
																		}
																		className="cursor-pointer"
																	>
																		<span
																			className={cn(
																				"mr-2",
																				editedDevice?.timezone === tz.value &&
																					"font-medium",
																			)}
																		>
																			{tz.label}
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
							</Field>
						</TabsContent>

						<TabsContent value="content" className="mt-4 space-y-4">
							<Field
								label="Display mode"
								hint="What should this device render?"
							>
								<ToggleGroup
									type="single"
									variant="outline"
									value={editedDevice.display_mode}
									onValueChange={(value) => {
										if (value) onSelectChange("display_mode", value);
									}}
									className="grid grid-cols-3"
								>
									<ToggleGroupItem value={DeviceDisplayMode.SCREEN}>
										Single
									</ToggleGroupItem>
									<ToggleGroupItem value={DeviceDisplayMode.PLAYLIST}>
										Playlist
									</ToggleGroupItem>
									<ToggleGroupItem value={DeviceDisplayMode.MIXUP}>
										Mixup
									</ToggleGroupItem>
								</ToggleGroup>
							</Field>

							{editedDevice.display_mode === DeviceDisplayMode.PLAYLIST && (
								<Field label="Playlist" htmlFor="playlist">
									<Select
										value={editedDevice?.playlist_id || ""}
										onValueChange={(value) =>
											onSelectChange(
												"playlist_id",
												value === "none" ? "" : value,
											)
										}
									>
										<SelectTrigger id="playlist" className="w-full">
											<SelectValue placeholder="Select playlist…" />
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
								</Field>
							)}

							{editedDevice.display_mode === DeviceDisplayMode.MIXUP && (
								<Field
									label="Mixup"
									htmlFor="mixup"
									hint="A mixup combines multiple recipes into a single split-screen layout."
								>
									<Select
										value={editedDevice?.mixup_id || ""}
										onValueChange={(value) =>
											onSelectChange("mixup_id", value === "none" ? "" : value)
										}
									>
										<SelectTrigger id="mixup" className="w-full">
											<SelectValue placeholder="Select mixup…" />
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
								</Field>
							)}

							{editedDevice.display_mode === DeviceDisplayMode.SCREEN && (
								<Field
									label="Screen component"
									htmlFor="screen"
									hint={`Default selection is ${DEFAULT_DEVICE_SCREEN}.`}
								>
									<Select
										value={editedDevice?.screen || ""}
										onValueChange={(value) => onScreenChange(value)}
									>
										<SelectTrigger id="screen" className="w-full">
											<SelectValue placeholder="Select screen…" />
										</SelectTrigger>
										<SelectContent>
											{availableScreens.map((screen) => (
												<SelectItem key={screen.id} value={screen.id}>
													{screen.title}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						</TabsContent>

						<TabsContent value="display" className="mt-4 space-y-4">
							<Field
								label="Device model"
								htmlFor="model"
								hint="Determines output format, dimensions, and available palettes."
							>
								<Select
									value={selectedModel?.name || ""}
									onValueChange={(value) => onSelectChange("model", value)}
								>
									<SelectTrigger id="model" className="w-full">
										<SelectValue placeholder="Select model…" />
									</SelectTrigger>
									<SelectContent>
										{trmnlModels.map((model) => (
											<SelectItem key={model.name} value={model.name}>
												{model.label} · {model.width}×{model.height} ·{" "}
												{model.mime_type.replace("image/", "")}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							{selectedPaletteIds.length > 0 && (
								<Field
									label="Palette"
									htmlFor="palette_id"
									hint="Restricted to palettes declared by the selected model."
								>
									<Select
										value={selectedPalette?.id || selectedPaletteIds[0]}
										onValueChange={(value) =>
											onSelectChange("palette_id", value)
										}
									>
										<SelectTrigger id="palette_id" className="w-full">
											<SelectValue placeholder="Select palette…" />
										</SelectTrigger>
										<SelectContent>
											{selectedPaletteIds.map((paletteId) => {
												const palette = trmnlPalettes.find(
													(item) => item.id === paletteId,
												);
												return (
													<SelectItem key={paletteId} value={paletteId}>
														{palette?.name ?? paletteId}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</Field>
							)}

							<Field label="Device size" htmlFor="device_size_preset">
								<Select
									value={deviceSizePreset}
									onValueChange={(value) =>
										onDeviceSizePresetChange(value as DeviceSizePreset)
									}
								>
									<SelectTrigger id="device_size_preset" className="w-full">
										<SelectValue placeholder="Select device size…" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="800x480">800 × 480</SelectItem>
										<SelectItem value="1872x1404">1872 × 1404</SelectItem>
										<SelectItem value="custom">Custom</SelectItem>
									</SelectContent>
								</Select>
							</Field>

							{deviceSizePreset === "custom" && (
								<div className="grid gap-3 sm:grid-cols-2">
									<Field label="Width (px)" htmlFor="screen_width">
										<Input
											id="screen_width"
											name="screen_width"
											type="number"
											min={1}
											value={editedDevice?.screen_width || DEFAULT_IMAGE_WIDTH}
											onChange={(e) =>
												onCustomSizeChange(
													"width",
													Number.parseInt(e.target.value, 10) ||
														DEFAULT_IMAGE_WIDTH,
												)
											}
										/>
									</Field>
									<Field label="Height (px)" htmlFor="screen_height">
										<Input
											id="screen_height"
											name="screen_height"
											type="number"
											min={1}
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
									</Field>
								</div>
							)}

							<Field label="Orientation" htmlFor="screen_orientation">
								<Select
									value={editedDevice?.screen_orientation || "landscape"}
									onValueChange={(value) =>
										onSelectChange("screen_orientation", value)
									}
								>
									<SelectTrigger id="screen_orientation" className="w-full">
										<SelectValue placeholder="Select orientation…" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="landscape">Landscape</SelectItem>
										<SelectItem value="portrait">Portrait</SelectItem>
									</SelectContent>
								</Select>
							</Field>

							{editedDevice.supports_temperature_profile && (
								<Field
									label="Temperature profile"
									hint="Try A then B if the display looks washed out."
								>
									<ToggleGroup
										type="single"
										value={editedDevice.temperature_profile ?? "default"}
										onValueChange={(value) => {
											if (value) onSelectChange("temperature_profile", value);
										}}
										variant="outline"
										className="grid w-fit grid-cols-4"
									>
										<ToggleGroupItem value="default">Default</ToggleGroupItem>
										<ToggleGroupItem value="a">A</ToggleGroupItem>
										<ToggleGroupItem value="b">B</ToggleGroupItem>
										<ToggleGroupItem value="c">C</ToggleGroupItem>
									</ToggleGroup>
								</Field>
							)}
						</TabsContent>

						<TabsContent value="refresh" className="mt-4 space-y-4">
							<Field
								label="Default refresh rate"
								htmlFor="refresh_schedule.default_refresh_rate"
								hint="Seconds between refreshes when no time range applies."
							>
								<Input
									id="refresh_schedule.default_refresh_rate"
									name="refresh_schedule.default_refresh_rate"
									type="number"
									value={
										editedDevice?.refresh_schedule?.default_refresh_rate ||
										UI_REFRESH_FALLBACK_SECONDS
									}
									onChange={onInputChange}
								/>
							</Field>

							<div className="space-y-2">
								<div className="flex items-end justify-between gap-2">
									<div>
										<Label className="text-xs font-semibold">
											Time-range overrides
										</Label>
										<p className="text-[11px] text-muted-foreground">
											Use a different rate during specific windows.
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={onAddTimeRange}
									>
										Add range
									</Button>
								</div>

								{editedDevice?.refresh_schedule?.time_ranges &&
								editedDevice.refresh_schedule.time_ranges.length > 0 ? (
									<div className="divide-y rounded-lg border">
										{editedDevice.refresh_schedule.time_ranges.map(
											(range, index) => (
												<div
													key={index}
													className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3"
												>
													<div className="space-y-1">
														<Label
															htmlFor={`start_time_${index}`}
															className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
														>
															Start
														</Label>
														<Input
															id={`start_time_${index}`}
															type="time"
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
															className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
														>
															End
														</Label>
														<Input
															id={`end_time_${index}`}
															type="time"
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
															className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
														>
															Rate (s)
														</Label>
														<Input
															id={`refresh_rate_${index}`}
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
													<div className="flex items-end">
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="text-muted-foreground hover:text-destructive"
															aria-label={`Remove time range ${index + 1}`}
															onClick={() => onRemoveTimeRange(index)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</div>
											),
										)}
									</div>
								) : (
									<p className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
										No custom time ranges configured.
									</p>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</section>
			</div>
		</form>
	);
}

function Field({
	label,
	htmlFor,
	hint,
	error,
	children,
}: {
	label: string;
	htmlFor?: string;
	hint?: string;
	error?: string | null;
	children: ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={htmlFor} className="text-xs font-semibold">
				{label}
			</Label>
			{children}
			{hint && !error && (
				<p className="text-[11px] text-muted-foreground">{hint}</p>
			)}
			{error && <p className="text-[11px] text-destructive">{error}</p>}
		</div>
	);
}
