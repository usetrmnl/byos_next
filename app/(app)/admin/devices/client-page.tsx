"use client";

import {
	MoreHorizontal,
	RefreshCw,
	Trash2,
	UserMinus,
	UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	assignDeviceToUser,
	deleteDeviceAdmin,
	fetchAllDevicesAdmin,
	fetchAllUsersForAdmin,
	unassignDevice,
	type AdminDevice,
	type AdminUser,
} from "@/app/actions/admin-devices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageTemplate } from "@/components/ui/page-template";
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

function maskApiKey(key: string) {
	if (key.length <= 8) return "****";
	return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export default function AdminDevicesClientPage() {
	const [devices, setDevices] = useState<AdminDevice[]>([]);
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);

	const [assignDialogOpen, setAssignDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<AdminDevice | null>(
		null,
	);
	const [selectedUserId, setSelectedUserId] = useState<string>("");

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const [devicesData, usersData] = await Promise.all([
				fetchAllDevicesAdmin(),
				fetchAllUsersForAdmin(),
			]);
			setDevices(devicesData);
			setUsers(usersData);
		} catch {
			toast.error("Failed to fetch data");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleAssign = async () => {
		if (!selectedDevice || !selectedUserId) return;
		const result = await assignDeviceToUser(selectedDevice.id, selectedUserId);
		if (result.success) {
			toast.success("Device assigned");
			setAssignDialogOpen(false);
			setSelectedDevice(null);
			setSelectedUserId("");
			fetchData();
		} else {
			toast.error(result.error || "Failed to assign device");
		}
	};

	const handleUnassign = async (device: AdminDevice) => {
		const result = await unassignDevice(device.id);
		if (result.success) {
			toast.success("Device unassigned");
			fetchData();
		} else {
			toast.error(result.error || "Failed to unassign device");
		}
	};

	const handleDelete = async () => {
		if (!selectedDevice) return;
		const result = await deleteDeviceAdmin(selectedDevice.id);
		if (result.success) {
			toast.success("Device deleted");
			setDeleteDialogOpen(false);
			setSelectedDevice(null);
			fetchData();
		} else {
			toast.error(result.error || "Failed to delete device");
		}
	};

	return (
		<PageTemplate
			title="Device Management"
			subtitle="Manage all devices across users"
			left={
				<Button variant="outline" size="icon" onClick={fetchData}>
					<RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
				</Button>
			}
		>
			<Card>
				<CardHeader>
					<CardTitle>Devices</CardTitle>
					<CardDescription>
						{devices.length} device{devices.length !== 1 ? "s" : ""} registered
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Friendly ID</TableHead>
								<TableHead>API Key</TableHead>
								<TableHead>MAC Address</TableHead>
								<TableHead>Owner</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[70px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-8">
										Loading devices...
									</TableCell>
								</TableRow>
							) : devices.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-8">
										No devices found
									</TableCell>
								</TableRow>
							) : (
								devices.map((device) => (
									<TableRow key={device.id}>
										<TableCell className="font-medium">
											{device.name}
										</TableCell>
										<TableCell>
											<code className="text-xs">{device.friendly_id}</code>
										</TableCell>
										<TableCell>
											<code className="text-xs">
												{maskApiKey(device.api_key)}
											</code>
										</TableCell>
										<TableCell>
											<code className="text-xs">{device.mac_address}</code>
										</TableCell>
										<TableCell>
											{device.user_name ? (
												<div>
													<span className="text-sm">{device.user_name}</span>
													<br />
													<span className="text-xs text-muted-foreground">
														{device.user_email}
													</span>
												</div>
											) : (
												<Badge variant="outline">Unassigned</Badge>
											)}
										</TableCell>
										<TableCell>
											{device.created_at
												? new Date(device.created_at).toLocaleDateString()
												: "—"}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon">
														<MoreHorizontal className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => {
															setSelectedDevice(device);
															setSelectedUserId(device.user_id || "");
															setAssignDialogOpen(true);
														}}
													>
														<UserPlus className="mr-2 size-4" />
														Assign to user
													</DropdownMenuItem>
													{device.user_id && (
														<DropdownMenuItem
															onClick={() => handleUnassign(device)}
														>
															<UserMinus className="mr-2 size-4" />
															Unassign
														</DropdownMenuItem>
													)}
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive"
														onClick={() => {
															setSelectedDevice(device);
															setDeleteDialogOpen(true);
														}}
													>
														<Trash2 className="mr-2 size-4" />
														Delete device
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Assign Device Dialog */}
			<Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign Device to User</DialogTitle>
						<DialogDescription>
							Assign &quot;{selectedDevice?.name}&quot; to a user.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Select value={selectedUserId} onValueChange={setSelectedUserId}>
							<SelectTrigger>
								<SelectValue placeholder="Select a user" />
							</SelectTrigger>
							<SelectContent>
								{users.map((user) => (
									<SelectItem key={user.id} value={user.id}>
										{user.name} ({user.email})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setAssignDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleAssign} disabled={!selectedUserId}>
							Assign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Device Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Device</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &quot;{selectedDevice?.name}
							&quot;? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							<Trash2 className="mr-2 size-4" />
							Delete Device
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageTemplate>
	);
}
