"use client";

import {
	Ban,
	CheckCircle,
	MoreHorizontal,
	Plus,
	RefreshCw,
	Shield,
	ShieldOff,
	Trash2,
	UserX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { authClient } from "@/lib/auth/auth-client";

interface User {
	id: string;
	name: string;
	email: string;
	role: string;
	banned: boolean;
	banReason?: string;
	banExpires?: string;
	createdAt: string;
	emailVerified: boolean;
}

export default function AdminUsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [newUser, setNewUser] = useState({
		name: "",
		email: "",
		password: "",
		role: "user",
	});

	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const response = await authClient.admin.listUsers({
				query: {
					limit: 100,
				},
			});
			if (response.data?.users) {
				setUsers(response.data.users as User[]);
			}
		} catch (_error) {
			toast.error("Failed to fetch users");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const handleCreateUser = async () => {
		try {
			const response = await authClient.admin.createUser({
				name: newUser.name,
				email: newUser.email,
				password: newUser.password,
				role: newUser.role as "admin" | "user",
			});
			if (response.error) {
				toast.error(response.error.message || "Failed to create user");
				return;
			}
			toast.success("User created successfully");
			setCreateDialogOpen(false);
			setNewUser({ name: "", email: "", password: "", role: "user" });
			fetchUsers();
		} catch (_error) {
			toast.error("Failed to create user");
		}
	};

	const handleSetRole = async (userId: string, role: "admin" | "user") => {
		try {
			const response = await authClient.admin.setRole({
				userId,
				role,
			});
			if (response.error) {
				toast.error(response.error.message || "Failed to update role");
				return;
			}
			toast.success(`Role updated to ${role}`);
			fetchUsers();
		} catch (_error) {
			toast.error("Failed to update role");
		}
	};

	const handleBanUser = async (userId: string) => {
		try {
			const response = await authClient.admin.banUser({
				userId,
				banReason: "Banned by admin",
			});
			if (response.error) {
				toast.error(response.error.message || "Failed to ban user");
				return;
			}
			toast.success("User banned");
			fetchUsers();
		} catch (_error) {
			toast.error("Failed to ban user");
		}
	};

	const handleUnbanUser = async (userId: string) => {
		try {
			const response = await authClient.admin.unbanUser({
				userId,
			});
			if (response.error) {
				toast.error(response.error.message || "Failed to unban user");
				return;
			}
			toast.success("User unbanned");
			fetchUsers();
		} catch (_error) {
			toast.error("Failed to unban user");
		}
	};

	const handleDeleteUser = async () => {
		if (!selectedUser) return;
		try {
			const response = await authClient.admin.removeUser({
				userId: selectedUser.id,
			});
			if (response.error) {
				toast.error(response.error.message || "Failed to delete user");
				return;
			}
			toast.success("User deleted");
			setDeleteDialogOpen(false);
			setSelectedUser(null);
			fetchUsers();
		} catch (_error) {
			toast.error("Failed to delete user");
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">User Management</h1>
					<p className="text-muted-foreground">
						Manage users, roles, and permissions
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="icon" onClick={fetchUsers}>
						<RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
					</Button>
					<Button onClick={() => setCreateDialogOpen(true)}>
						<Plus className="mr-2 size-4" />
						Add User
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Users</CardTitle>
					<CardDescription>
						{users.length} user{users.length !== 1 ? "s" : ""} registered
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[70px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8">
										Loading users...
									</TableCell>
								</TableRow>
							) : users.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8">
										No users found
									</TableCell>
								</TableRow>
							) : (
								users.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">{user.name}</TableCell>
										<TableCell>{user.email}</TableCell>
										<TableCell>
											<Badge
												variant={
													user.role === "admin" ? "default" : "secondary"
												}
											>
												{user.role}
											</Badge>
										</TableCell>
										<TableCell>
											{user.banned ? (
												<Badge variant="destructive">Banned</Badge>
											) : (
												<Badge variant="outline">
													<CheckCircle className="mr-1 size-3" />
													Active
												</Badge>
											)}
										</TableCell>
										<TableCell>
											{new Date(user.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon">
														<MoreHorizontal className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{user.role !== "admin" ? (
														<DropdownMenuItem
															onClick={() => handleSetRole(user.id, "admin")}
														>
															<Shield className="mr-2 size-4" />
															Make admin
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={() => handleSetRole(user.id, "user")}
														>
															<ShieldOff className="mr-2 size-4" />
															Remove admin
														</DropdownMenuItem>
													)}
													<DropdownMenuSeparator />
													{user.banned ? (
														<DropdownMenuItem
															onClick={() => handleUnbanUser(user.id)}
														>
															<CheckCircle className="mr-2 size-4" />
															Unban user
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={() => handleBanUser(user.id)}
														>
															<Ban className="mr-2 size-4" />
															Ban user
														</DropdownMenuItem>
													)}
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive"
														onClick={() => {
															setSelectedUser(user);
															setDeleteDialogOpen(true);
														}}
													>
														<Trash2 className="mr-2 size-4" />
														Delete user
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

			{/* Create User Dialog */}
			<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New User</DialogTitle>
						<DialogDescription>
							Add a new user to the system. They will receive their credentials
							directly.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={newUser.name}
								onChange={(e) =>
									setNewUser({ ...newUser, name: e.target.value })
								}
								placeholder="John Doe"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={newUser.email}
								onChange={(e) =>
									setNewUser({ ...newUser, email: e.target.value })
								}
								placeholder="john@example.com"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={newUser.password}
								onChange={(e) =>
									setNewUser({ ...newUser, password: e.target.value })
								}
								placeholder="Minimum 8 characters"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="role">Role</Label>
							<Select
								value={newUser.role}
								onValueChange={(value) =>
									setNewUser({ ...newUser, role: value })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="user">User</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleCreateUser}>Create User</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete User Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete User</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete {selectedUser?.name}? This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteUser}>
							<UserX className="mr-2 size-4" />
							Delete User
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
