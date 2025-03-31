"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { RefreshCw, Save, X, Search } from "lucide-react";
import { toast } from "sonner";

import type { Device } from "@/lib/supabase/types";
import { updateDevice, fetchDeviceByFriendlyId } from "@/app/actions/device";
import {
	formatDate,
	estimateBatteryLife,
	isValidApiKey,
	isValidFriendlyId,
	generateApiKey,
	generateFriendlyId,
	timezones,
	formatTimezone,
	getDeviceStatus,
} from "@/utils/helpers";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import DeviceLogsContainer from "@/components/device-logs/device-logs-container";

// Helper function to convert RSSI to signal quality description
const getSignalQuality = (rssi: number): string => {
	if (rssi >= -50) return "Excellent";
	if (rssi >= -60) return "Good";
	if (rssi >= -70) return "Fair";
	if (rssi >= -80) return "Poor";
	return "Very Poor";
};

interface DevicePageClientProps {
	initialDevice: Device & { status?: string; type?: string };
	availableScreens: { id: string; title: string }[];
}

export default function DevicePageClient({
	initialDevice,
	availableScreens,
}: DevicePageClientProps) {
	const [device, setDevice] = useState<
		Device & { status?: string; type?: string }
	>(initialDevice);
	const [isEditing, setIsEditing] = useState(false);
	const [editedDevice, setEditedDevice] = useState<
		Device & { status?: string; type?: string }
	>(JSON.parse(JSON.stringify(initialDevice)));
	const [isSaving, setIsSaving] = useState(false);

	// State for validation error messages
	const [apiKeyError, setApiKeyError] = useState<string | null>(null);
	const [friendlyIdError, setFriendlyIdError] = useState<string | null>(null);

	// Handle form input changes
	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;

		// Validate API key
		if (name === "api_key") {
			if (!isValidApiKey(value)) {
				setApiKeyError(
					"API Key must be alphanumeric and between 20 to 60 characters long.",
				);
			} else {
				setApiKeyError(null);
			}
		}

		// Validate Friendly ID
		if (name === "friendly_id") {
			if (!isValidFriendlyId(value)) {
				setFriendlyIdError(
					"Friendly ID must be exactly 6 uppercase alphanumeric characters.",
				);
			} else {
				setFriendlyIdError(null);
			}
		}

		// Handle nested properties
		if (name.includes(".")) {
			const [parent, child] = name.split(".");
			setEditedDevice({
				...editedDevice,
				[parent]: {
					...(editedDevice[parent as keyof Device] as Record<string, unknown>),
					[child]: value,
				},
			});
		} else {
			setEditedDevice({
				...editedDevice,
				[name]: value,
			});
		}
	};

	// Handle nested input changes (for arrays)
	const handleNestedInputChange = (path: string, value: string) => {
		const pathParts = path.split(".");
		const parent = pathParts[0];

		if (parent === "refresh_schedule" && pathParts[1] === "time_ranges") {
			const index = Number.parseInt(pathParts[2]);
			const field = pathParts[3];

			if (!editedDevice.refresh_schedule) return;

			const updatedTimeRanges = [
				...(editedDevice.refresh_schedule.time_ranges || []),
			];

			if (!updatedTimeRanges[index]) {
				updatedTimeRanges[index] = {
					start_time: "",
					end_time: "",
					refresh_rate: 300,
				};
			}

			updatedTimeRanges[index] = {
				...updatedTimeRanges[index],
				[field]: field === "refresh_rate" ? Number.parseInt(value) : value,
			};

			setEditedDevice({
				...editedDevice,
				refresh_schedule: {
					default_refresh_rate:
						editedDevice.refresh_schedule.default_refresh_rate,
					time_ranges: updatedTimeRanges,
				},
			});
		}
	};

	// Handle select changes
	const handleSelectChange = (name: string, value: string) => {
		// Handle nested properties
		if (name.includes(".")) {
			const [parent, child] = name.split(".");
			setEditedDevice({
				...editedDevice,
				[parent]: {
					...(editedDevice[parent as keyof Device] as Record<string, unknown>),
					[child]: value,
				},
			});
		} else {
			setEditedDevice({
				...editedDevice,
				[name]: value,
			});
		}
	};

	// Handle screen change
	const handleScreenChange = (screenId: string | null) => {
		setEditedDevice({
			...editedDevice,
			screen: screenId,
		});
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate API key
		if (!isValidApiKey(editedDevice.api_key)) {
			setApiKeyError(
				"API Key must be alphanumeric and between 20 to 60 characters long.",
			);
			return;
		}

		// Validate Friendly ID
		if (!isValidFriendlyId(editedDevice.friendly_id)) {
			setFriendlyIdError(
				"Friendly ID must be exactly 6 uppercase alphanumeric characters.",
			);
			return;
		}

		setIsSaving(true);

		try {
			// Send update to the server
			const result = await updateDevice({
				id: editedDevice.id,
				name: editedDevice.name,
				mac_address: editedDevice.mac_address,
				api_key: editedDevice.api_key,
				friendly_id: editedDevice.friendly_id,
				timezone: editedDevice.timezone,
				refresh_schedule: editedDevice.refresh_schedule,
				screen: editedDevice.screen,
			});

			if (result.success) {
				// Fetch the updated device to ensure we have the latest data
				const updatedDevice = await fetchDeviceByFriendlyId(
					editedDevice.friendly_id,
				);

				if (updatedDevice) {
					// Update the device state with the latest data
					const enhancedDevice = {
						...updatedDevice,
						status: getDeviceStatus(updatedDevice),
					};

					setDevice(enhancedDevice);
					setEditedDevice(JSON.parse(JSON.stringify(enhancedDevice)));

					toast("Device updated", {
						description: "The device has been successfully updated.",
					});
				}
			} else {
				toast.error("Update failed", {
					description:
						result.error || "Failed to update device. Please try again.",
				});
			}
		} catch (error) {
			console.error("Error updating device:", error);
			toast.error("Update failed", {
				description: "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsSaving(false);
			setIsEditing(false);
		}
	};

	// Cancel editing
	const handleCancel = () => {
		// Reset to original values
		setEditedDevice(JSON.parse(JSON.stringify(device)));
		setIsEditing(false);
	};

	// Handle regenerating API Key
	const handleRegenerateApiKey = () => {
		const api_key = generateApiKey(
			editedDevice.mac_address,
			new Date().toISOString().replace(/[-:Z]/g, ""),
		); // Use a new salt
		setEditedDevice({
			...editedDevice,
			api_key,
		});
		setApiKeyError(null); // Clear the error message
	};

	// Handle regenerating Friendly ID
	const handleRegenerateFriendlyId = () => {
		const friendly_id = generateFriendlyId(
			editedDevice.mac_address,
			new Date().toISOString().replace(/[-:Z]/g, ""),
		); // Use a new salt
		setEditedDevice({
			...editedDevice,
			friendly_id,
		});
		setFriendlyIdError(null); // Clear the error message
	};

	// Add a time range to the refresh schedule
	const handleAddTimeRange = () => {
		const newTimeRange = {
			start_time: "09:00",
			end_time: "17:00",
			refresh_rate: 300,
		};

		const currentTimeRanges = editedDevice.refresh_schedule?.time_ranges || [];
		const defaultRefreshRate =
			editedDevice.refresh_schedule?.default_refresh_rate || 300;

		setEditedDevice({
			...editedDevice,
			refresh_schedule: {
				default_refresh_rate: defaultRefreshRate,
				time_ranges: [...currentTimeRanges, newTimeRange],
			},
		});
	};

	// Calculate refresh per day based on refresh schedule
	const calculateRefreshPerDay = (
		deviceData: Device & { status?: string; type?: string },
	): number => {
		if (!deviceData || !deviceData.refresh_schedule) return 0;

		// Default refresh rate in seconds
		const defaultRefreshRate =
			deviceData.refresh_schedule.default_refresh_rate || 300;

		// Calculate refreshes per day from default rate
		let refreshesPerDay = (24 * 60 * 60) / defaultRefreshRate;

		// Adjust for time ranges if they exist
		if (
			deviceData.refresh_schedule.time_ranges &&
			deviceData.refresh_schedule.time_ranges.length > 0
		) {
			// This is a simplified calculation - a more accurate one would account for overlapping ranges
			for (const range of deviceData.refresh_schedule.time_ranges) {
				// Parse start and end times
				const [startHour, startMinute] = range.start_time
					.split(":")
					.map(Number);
				const [endHour, endMinute] = range.end_time.split(":").map(Number);

				// Calculate duration in hours
				const startTimeInMinutes = startHour * 60 + startMinute;
				const endTimeInMinutes = endHour * 60 + endMinute;
				const durationInHours = (endTimeInMinutes - startTimeInMinutes) / 60;

				// Calculate refreshes during this time range
				const rangeRefreshes = (durationInHours * 60 * 60) / range.refresh_rate;

				// Subtract default refreshes during this period and add custom refreshes
				refreshesPerDay =
					refreshesPerDay -
					(durationInHours * 60 * 60) / defaultRefreshRate +
					rangeRefreshes;
			}
		}

		return Math.max(0, refreshesPerDay);
	};

	return (
		<>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-2">
					<h2 className="mt-10 scroll-m-20 pb-0 text-3xl font-semibold tracking-tight transition-colors first:mt-0 text-box">
						{device.name}
					</h2>
					<Badge
						className={`text-xs h-[1lh] px-1 py-0 text-white overflow-hidden ${device.status === "online" ? "bg-green-500" : "bg-red-500"}`}
					>
						{device.status}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					{isEditing ? (
						<>
							<Button
								size="sm"
								variant="outline"
								onClick={handleCancel}
								disabled={isSaving}
							>
								<X className="h-4 w-4 mr-2" />
								Cancel
							</Button>
							<Button size="sm" onClick={handleSubmit} disabled={isSaving}>
								{isSaving ? (
									<>
										<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4 mr-2" />
										Save Changes
									</>
								)}
							</Button>
						</>
					) : (
						<>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setIsEditing(true)}
							>
								Edit Device
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Rest of the component rendered conditionally based on isEditing state */}
			{isEditing ? (
				// Edit form
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="text-base">Edit Device Information</CardTitle>
						<CardDescription className="text-xs">
							Update device details and configuration
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit}>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Device Name</Label>
									<Input
										id="name"
										name="name"
										value={editedDevice?.name || ""}
										onChange={handleInputChange}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="friendly_id">Friendly ID</Label>
									<div className="flex gap-2">
										<Input
											id="friendly_id"
											name="friendly_id"
											value={editedDevice?.friendly_id || ""}
											onChange={handleInputChange}
											className="font-mono"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={handleRegenerateFriendlyId}
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
									<Label htmlFor="mac_address">MAC Address</Label>
									<Input
										id="mac_address"
										name="mac_address"
										value={editedDevice?.mac_address || ""}
										onChange={handleInputChange}
									/>
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
																				handleSelectChange(
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
								<div className="space-y-2">
									<Label htmlFor="api_key">API Key</Label>
									<div className="flex gap-2">
										<Input
											id="api_key"
											name="api_key"
											value={editedDevice?.api_key || ""}
											onChange={handleInputChange}
											className="font-mono"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={handleRegenerateApiKey}
											title="Generate new API Key"
										>
											<RefreshCw className="h-4 w-4" />
										</Button>
									</div>
									{apiKeyError && <p className="text-red-500">{apiKeyError}</p>}
								</div>
								<div className="space-y-2">
									<Label htmlFor="refresh_schedule.default_refresh_rate">
										Default Refresh Rate (seconds)
									</Label>
									<Input
										id="refresh_schedule.default_refresh_rate"
										name="refresh_schedule.default_refresh_rate"
										type="number"
										value={
											editedDevice?.refresh_schedule?.default_refresh_rate ||
											300
										}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							<div className="border-t pt-4 mt-4">
								<h3 className="text-sm font-medium mb-3">
									Refresh Schedule Time Ranges
								</h3>
								{editedDevice?.refresh_schedule?.time_ranges?.map(
									(range, index) => (
										<div
											key={index}
											className="grid grid-cols-3 gap-2 items-end mb-3"
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
														handleNestedInputChange(
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
														handleNestedInputChange(
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
														handleNestedInputChange(
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
									editedDevice.refresh_schedule.time_ranges.length === 0) && (
									<p className="text-sm text-muted-foreground">
										No custom time ranges configured.
									</p>
								)}

								<Button
									type="button"
									variant="outline"
									size="sm"
									className="mt-2"
									onClick={handleAddTimeRange}
								>
									Add Time Range
								</Button>
							</div>

							<div className="space-y-2">
								<Label htmlFor="screen">Screen Component</Label>
								<Select
									value={editedDevice?.screen || ""}
									onValueChange={(value) =>
										handleScreenChange(value === "none" ? null : value)
									}
									disabled={!isEditing}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select screen..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">None (Use default)</SelectItem>
										{availableScreens.map((screen) => (
											<SelectItem key={screen.id} value={screen.id}>
												{screen.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									The screen component to display on this device. If not set,
									the default screen will be used.
								</p>
							</div>
							<div className="w-full max-w-3xl">
								<AspectRatio ratio={5 / 3}>
									<Image
										src={`/api/bitmap/${editedDevice?.screen || "simple-text"}.bmp`}
										alt="Device Screen"
										fill
										className="object-cover rounded-xs ring-2 ring-gray-200"
										style={{ imageRendering: "pixelated" }}
										unoptimized
									/>
								</AspectRatio>
							</div>
						</CardContent>
						<CardFooter className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
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
			) : (
				// View mode
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Device Information</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="col-span-1 md:col-span-2 lg:col-span-3">
								<dt className="text-sm font-medium text-muted-foreground">
									Status
								</dt>
								<dd className="text-sm flex items-center gap-2">
									<span
										className={`inline-block w-2 h-2 rounded-full ${device.status === "online" ? "bg-green-500" : "bg-red-500"}`}
									/>
									<span className="text-box capitalize">{device.status}</span>
									{device.last_update_time && (
										<span className="text-muted-foreground">
											Last update: {formatDate(device.last_update_time)}
										</span>
									)}
								</dd>
							</div>

							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Name
								</dt>
								<dd className="text-sm text-box">{device.name}</dd>
							</div>

							<div className="col-span-1 md:col-span-1">
								<dt className="text-sm font-medium text-muted-foreground">
									Friendly ID
								</dt>
								<dd className="text-sm flex flex-col sm:flex-row sm:gap-4">
									<span className="font-mono">{device.friendly_id}</span>
									<span className="text-xs text-muted-foreground mt-1 sm:mt-0">
										MAC: {device.mac_address}
									</span>
								</dd>
							</div>

							<div>
								<dt className="text-sm font-medium text-muted-foreground">
									Timezone
								</dt>
								<dd className="text-sm">{formatTimezone(device.timezone)}</dd>
							</div>

							{device.battery_voltage && (
								<div className="col-span-1 md:col-span-2 lg:col-span-3 order-first md:order-none">
									<dt className="text-sm font-medium text-muted-foreground">
										Battery Status
									</dt>
									<dd className="mt-1">
										{(() => {
											const refreshPerDay = calculateRefreshPerDay(device);
											const batteryEstimate = estimateBatteryLife(
												device.battery_voltage,
												refreshPerDay,
											);

											// Determine color based on battery percentage
											let batteryColor = "bg-primary";
											if (batteryEstimate.batteryPercentage < 20) {
												batteryColor = "bg-red-500";
											} else if (batteryEstimate.batteryPercentage < 50) {
												batteryColor = "bg-yellow-500";
											}

											return (
												<div className="space-y-1">
													<div className="flex items-center gap-2 flex-wrap">
														<div className="flex items-center">
															<div className="relative w-10 h-5 border-1 border-primary rounded-sm p-0.5 overflow-hidden shadow-inner shadow-background/20">
																<div
																	className={`h-full rounded-[calc(var(--radius)-7px)] transition-all duration-300 ease-in-out ${batteryColor} flex items-center justify-center p-0 gap-0`}
																	style={{
																		width: `${batteryEstimate.batteryPercentage}%`,
																	}}
																>
																	{batteryEstimate.isCharging && (
																		<span className="bg-green-400 text-transparent bg-clip-text">
																			⚡️
																		</span>
																	)}
																</div>
															</div>
															{/* positive end of the battery */}
															<div className="ml-[1px] h-2 w-0.5 bg-primary rounded-r-sm" />
														</div>
														<span className="text-sm font-medium">
															{batteryEstimate.isCharging
																? "Charging"
																: `${batteryEstimate.batteryPercentage}%`}
														</span>
														<span className="text-sm font-medium">
															{device.battery_voltage.toFixed(2)}V
														</span>
														<span className="text-sm text-muted-foreground">
															{batteryEstimate.isCharging
																? "can not estimate days remaining while charging"
																: `~${batteryEstimate.remainingDays} days remaining based on ${refreshPerDay} refreshes per day`}
														</span>
													</div>
												</div>
											);
										})()}
									</dd>
								</div>
							)}

							<div className="flex flex-col">
								<dt className="text-sm font-medium text-muted-foreground">
									WiFi Signal
								</dt>
								<dd className="text-sm">
									{device.rssi
										? `${device.rssi} dBm (${getSignalQuality(device.rssi)})`
										: "Unknown"}
								</dd>
							</div>

							<div className="flex flex-col">
								<dt className="text-sm font-medium text-muted-foreground">
									Firmware
								</dt>
								<dd className="text-sm">
									{device.firmware_version || "Unknown"}
								</dd>
							</div>

							<div className="flex flex-col">
								<dt className="text-sm font-medium text-muted-foreground">
									Refresh Info
								</dt>
								<dd className="text-sm flex flex-col">
									<span>
										{device.last_refresh_duration
											? `Last duration: ${device.last_refresh_duration}s`
											: "Unknown duration"}
									</span>
									<span className="text-xs text-muted-foreground mt-1">
										Next update:{" "}
										{device.next_expected_update
											? formatDate(device.next_expected_update)
											: "Unknown"}
									</span>
								</dd>
							</div>

							<div className="col-span-1 md:col-span-2 lg:col-span-3">
								<AspectRatio ratio={5 / 3}>
									<Image
										src={`/api/bitmap/${device?.screen || "simple-text"}.bmp`}
										alt="Device Screen"
										fill
										className="object-cover rounded-xs ring-2 ring-gray-200"
										style={{ imageRendering: "pixelated" }}
										unoptimized
									/>
								</AspectRatio>
							</div>
						</dl>
					</CardContent>
				</Card>
			)}

			{/* Device Logs */}
			<div className="w-full">
				<DeviceLogsContainer device={device} />
			</div>
		</>
	);
}
