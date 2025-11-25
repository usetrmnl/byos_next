"use client";

import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	addDevice,
	deleteDevice,
	fetchAllDevices,
} from "@/app/actions/maintenance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Device } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	formatTimezone,
	generateApiKey,
	generateFriendlyId,
	getDeviceStatus,
	timezones,
} from "@/utils/helpers";

export function DeviceManagement() {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [devices, setDevices] = useState<Device[]>([]);
	const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] =
		useState<boolean>(false);
	const [newDevice, setNewDevice] = useState<{
		name: string;
		friendly_id: string;
		mac_address: string;
		api_key: string;
		screen: string;
		timezone: string;
	}>({
		name: "",
		friendly_id: "",
		mac_address: "",
		api_key: "",
		screen: "simple-text",
		timezone: "Europe/London",
	});

	// Function to load devices from the database
	const loadDevices = useCallback(async () => {
		try {
			setIsLoading(true);
			const devicesData = await fetchAllDevices();
			setDevices(devicesData);
		} catch (error) {
			console.error("Error loading devices:", error);
			toast.error("Failed to load devices");
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Load devices on component mount
	useEffect(() => {
		loadDevices();
	}, [loadDevices]);

	// Handle MAC address input change with formatting
	const handleMacAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = e.target;

		// Format MAC address as XX:XX:XX:XX:XX:XX
		const formattedValue = value
			.replace(/[^0-9A-Fa-f]/g, "")
			.slice(0, 12)
			.replace(/(.{2})/g, "$1:")
			.slice(0, 17);

		setNewDevice({
			...newDevice,
			mac_address: formattedValue,
			friendly_id: value.length >= 12 ? generateFriendlyId(value) : "",
			api_key: value.length >= 12 ? generateApiKey(value) : "",
		});
	};

	// Handle regenerating friendly ID
	const handleRegenerateFriendlyId = () => {
		if (newDevice.mac_address.length < 12) {
			toast.error("Please enter a valid MAC address first");
			return;
		}

		setNewDevice({
			...newDevice,
			friendly_id: generateFriendlyId(newDevice.mac_address),
		});
	};

	// Handle regenerating API key
	const handleRegenerateApiKey = () => {
		if (newDevice.mac_address.length < 12) {
			toast.error("Please enter a valid MAC address first");
			return;
		}

		setNewDevice({
			...newDevice,
			api_key: generateApiKey(newDevice.mac_address),
		});
	};

	// Handle adding a new device
	const handleAddDevice = async () => {
		try {
			setIsLoading(true);

			// Validate required fields
			if (
				!newDevice.name ||
				!newDevice.mac_address ||
				!newDevice.friendly_id ||
				!newDevice.api_key
			) {
				toast.error("Please fill in all required fields");
				return;
			}

			const result = await addDevice({
				name: newDevice.name,
				mac_address: newDevice.mac_address,
				friendly_id: newDevice.friendly_id,
				api_key: newDevice.api_key,
				screen: newDevice.screen,
				timezone: newDevice.timezone,
			});

			if (result.success) {
				toast.success("Device added successfully");

				// Reset form and close dialog
				setNewDevice({
					name: "",
					friendly_id: "",
					mac_address: "",
					api_key: "",
					screen: "simple-text",
					timezone: "Europe/London",
				});
				setIsAddDeviceDialogOpen(false);

				// Reload devices to show the new one
				loadDevices();
			} else {
				toast.error(`Failed to add device: ${result.error}`);
			}
		} catch (error) {
			console.error("Error adding device:", error);
			toast.error("Failed to add device");
		} finally {
			setIsLoading(false);
		}
	};

	// Handle deleting a device
	const handleDeleteDeviceById = async (id: number) => {
		if (!confirm("Are you sure you want to delete this device?")) {
			return;
		}

		try {
			setIsLoading(true);
			const result = await deleteDevice(id);

			if (result.success) {
				toast.success("Device deleted successfully");

				// Reload devices to update the list
				loadDevices();
			} else {
				toast.error(`Failed to delete device: ${result.error}`);
			}
		} catch (error) {
			console.error("Error deleting device:", error);
			toast.error("Failed to delete device");
		} finally {
			setIsLoading(false);
		}
	};

	// Handle input change for new device form
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setNewDevice({ ...newDevice, [name]: value });
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-2xl font-semibold">Device Management</h3>
				<Dialog
					open={isAddDeviceDialogOpen}
					onOpenChange={setIsAddDeviceDialogOpen}
				>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Add Device
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[500px]">
						<DialogHeader>
							<DialogTitle>Add New Device</DialogTitle>
							<DialogDescription>
								Create a new device with the specified details.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="name" className="text-right">
									Name
								</Label>
								<Input
									id="name"
									name="name"
									value={newDevice.name}
									onChange={handleInputChange}
									className="col-span-3"
									placeholder="My Device"
								/>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="mac_address" className="text-right">
									MAC Address
								</Label>
								<Input
									id="mac_address"
									name="mac_address"
									value={newDevice.mac_address}
									onChange={handleMacAddressChange}
									className="col-span-3"
									placeholder="00:1A:2B:3C:4D:5E"
								/>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="friendly_id" className="text-right">
									Friendly ID
								</Label>
								<div className="flex col-span-3 gap-2">
									<Input
										id="friendly_id"
										name="friendly_id"
										value={newDevice.friendly_id}
										onChange={handleInputChange}
										className="flex-1"
										placeholder="ABC123"
									/>
									<Button
										variant="outline"
										size="icon"
										onClick={handleRegenerateFriendlyId}
										title="Regenerate Friendly ID"
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="api_key" className="text-right">
									API Key
								</Label>
								<div className="flex col-span-3 gap-2">
									<Input
										id="api_key"
										name="api_key"
										value={newDevice.api_key}
										onChange={handleInputChange}
										className="flex-1"
										placeholder="abcdef123456"
									/>
									<Button
										variant="outline"
										size="icon"
										onClick={handleRegenerateApiKey}
										title="Regenerate API Key"
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="screen" className="text-right">
									Screen Type
								</Label>
								<Select
									value={newDevice.screen}
									onValueChange={(value) =>
										setNewDevice({ ...newDevice, screen: value })
									}
								>
									<SelectTrigger className="col-span-3">
										<SelectValue placeholder="Select screen type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="simple-text">Simple Text</SelectItem>
										<SelectItem value="weather">Weather</SelectItem>
										<SelectItem value="calendar">Calendar</SelectItem>
										<SelectItem value="dashboard">Dashboard</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="timezone" className="text-right">
									Timezone
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full justify-between col-span-3"
										>
											{newDevice.timezone
												? formatTimezone(newDevice.timezone)
												: "Select timezone..."}
											<Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-full p-0">
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
																.filter((tz) => tz.region === region)
																.map((tz) => (
																	<CommandItem
																		key={tz.value}
																		value={tz.value}
																		onSelect={(value) => {
																			setNewDevice({
																				...newDevice,
																				timezone: value,
																			});
																		}}
																	>
																		{tz.label}
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
						<DialogFooter>
							<Button onClick={handleAddDevice} disabled={isLoading}>
								{isLoading ? (
									<>
										<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
										Adding...
									</>
								) : (
									"Add Device"
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardContent className="p-0">
					{devices.length === 0 ? (
						<div className="p-6 text-center">
							<p className="text-muted-foreground">No devices found.</p>
							<Button
								variant="outline"
								className="mt-4"
								onClick={() => setIsAddDeviceDialogOpen(true)}
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Your First Device
							</Button>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Friendly ID</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Screen</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{devices.map((device) => {
									const status = getDeviceStatus(device);
									return (
										<TableRow key={device.id}>
											<TableCell className="font-medium">
												{device.name}
											</TableCell>
											<TableCell>{device.friendly_id}</TableCell>
											<TableCell>
												<Badge
													variant={
														status === "online" ? "default" : "destructive"
													}
													className={cn(
														"capitalize",
														status === "online" ? "bg-green-500" : "",
													)}
												>
													{status}
												</Badge>
											</TableCell>
											<TableCell>{device.screen || "None"}</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button variant="outline" size="sm" asChild>
														<Link href={`/device/${device.friendly_id}`}>
															Edit
														</Link>
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => handleDeleteDeviceById(device.id)}
														disabled={isLoading}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
