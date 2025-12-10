"use client";

import { RefreshCw, Save, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchDeviceByFriendlyId, updateDevice } from "@/app/actions/device";
import DeviceEditForm from "@/components/device/device-edit-form";
import DeviceView from "@/components/device/device-view";
import DeviceLogsContainer from "@/components/device-logs/device-logs-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Device, Mixup, Playlist, PlaylistItem } from "@/lib/types";
import {
	generateApiKey,
	generateFriendlyId,
	getDeviceStatus,
	isValidApiKey,
	isValidFriendlyId,
} from "@/utils/helpers";

// Device size presets
const DEVICE_SIZE_PRESETS = {
	"800x480": { width: 800, height: 480 },
	"1872x1404": { width: 1872, height: 1404 },
	custom: null,
} as const;

type DeviceSizePreset = keyof typeof DEVICE_SIZE_PRESETS;

interface DevicePageClientProps {
	initialDevice: Device & { status?: string; type?: string };
	availableScreens: { id: string; title: string }[];
	availablePlaylists: Playlist[];
	availableMixups: Mixup[];
	playlistItems: PlaylistItem[];
}

export default function DevicePageClient({
	initialDevice,
	availableScreens,
	availablePlaylists,
	availableMixups,
	playlistItems,
}: DevicePageClientProps) {
	const [device, setDevice] = useState<
		Device & { status?: string; type?: string }
	>(initialDevice);
	const [isEditing, setIsEditing] = useState(false);
	const [editedDevice, setEditedDevice] = useState<
		Device & { status?: string; type?: string }
	>(JSON.parse(JSON.stringify(initialDevice)));
	const [playlistScreens, setPlaylistScreens] = useState<
		{ screen: string; duration: number }[]
	>([]);
	const [isSaving, setIsSaving] = useState(false);

	// State for validation error messages
	const [apiKeyError, setApiKeyError] = useState<string | null>(null);
	const [friendlyIdError, setFriendlyIdError] = useState<string | null>(null);

	// State for device size preset
	const [deviceSizePreset, setDeviceSizePreset] = useState<DeviceSizePreset>(
		() => {
			const width = editedDevice.screen_width || DEFAULT_IMAGE_WIDTH;
			const height = editedDevice.screen_height || DEFAULT_IMAGE_HEIGHT;

			// Check if current dimensions match a preset
			if (width === 800 && height === 480) return "800x480";
			if (width === 1872 && height === 1404) return "1872x1404";
			return "custom";
		},
	);

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
			const index = Number.parseInt(pathParts[2], 10);
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
				[field]: field === "refresh_rate" ? Number.parseInt(value, 10) : value,
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
			// Convert grayscale to number
			if (name === "grayscale") {
				setEditedDevice({
					...editedDevice,
					[name]: Number.parseInt(value, 10),
				});
			} else {
				setEditedDevice({
					...editedDevice,
					[name]: value,
				});
			}
		}
	};

	// Handle screen change
	const handleScreenChange = (screenId: string | null) => {
		setEditedDevice({
			...editedDevice,
			screen: screenId,
		});
	};

	// Handle device size preset change
	const handleDeviceSizePresetChange = (preset: DeviceSizePreset) => {
		setDeviceSizePreset(preset);
		if (preset !== "custom" && DEVICE_SIZE_PRESETS[preset]) {
			const { width, height } = DEVICE_SIZE_PRESETS[preset];
			setEditedDevice({
				...editedDevice,
				screen_width: width,
				screen_height: height,
			});
		}
	};

	// Handle custom width/height change
	const handleCustomSizeChange = (field: "width" | "height", value: number) => {
		setEditedDevice({
			...editedDevice,
			screen_width:
				field === "width"
					? value
					: editedDevice.screen_width || DEFAULT_IMAGE_WIDTH,
			screen_height:
				field === "height"
					? value
					: editedDevice.screen_height || DEFAULT_IMAGE_HEIGHT,
		});
		// Update preset to custom if dimensions don't match a preset
		const width =
			field === "width"
				? value
				: editedDevice.screen_width || DEFAULT_IMAGE_WIDTH;
		const height =
			field === "height"
				? value
				: editedDevice.screen_height || DEFAULT_IMAGE_HEIGHT;
		if (
			!(width === 800 && height === 480) &&
			!(width === 1872 && height === 1404)
		) {
			setDeviceSizePreset("custom");
		}
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
				playlist_id: editedDevice.playlist_id,
				mixup_id: editedDevice.mixup_id,
				display_mode: editedDevice.display_mode,
				screen_width: editedDevice.screen_width,
				screen_height: editedDevice.screen_height,
				screen_orientation: editedDevice.screen_orientation,
				grayscale: editedDevice.grayscale,
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

	useEffect(() => {
		if (editedDevice.playlist_id) {
			const playlistScreens = playlistItems
				.filter((item) => item.playlist_id === editedDevice.playlist_id)
				.map((item) => ({
					screen: item.screen_id,
					duration: item.duration,
				}));
			setPlaylistScreens(playlistScreens);
		}
	}, [editedDevice.playlist_id, playlistItems]);

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
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(true)}
						>
							Edit Device
						</Button>
					)}
				</div>
			</div>

			{isEditing ? (
				<DeviceEditForm
					editedDevice={editedDevice}
					availableScreens={availableScreens}
					availablePlaylists={availablePlaylists}
					availableMixups={availableMixups}
					deviceSizePreset={deviceSizePreset}
					apiKeyError={apiKeyError}
					friendlyIdError={friendlyIdError}
					isSaving={isSaving}
					onInputChange={handleInputChange}
					onNestedInputChange={handleNestedInputChange}
					onSelectChange={handleSelectChange}
					onScreenChange={handleScreenChange}
					onDeviceSizePresetChange={handleDeviceSizePresetChange}
					onCustomSizeChange={handleCustomSizeChange}
					onRegenerateApiKey={handleRegenerateApiKey}
					onRegenerateFriendlyId={handleRegenerateFriendlyId}
					onAddTimeRange={handleAddTimeRange}
					onSubmit={handleSubmit}
					onCancel={handleCancel}
				/>
			) : (
				<DeviceView device={device} playlistScreens={playlistScreens} />
			)}

			{/* Device Logs */}
			<div className="w-full">
				<DeviceLogsContainer device={device} />
			</div>
		</>
	);
}
