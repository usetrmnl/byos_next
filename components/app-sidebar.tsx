"use client";

import {
	BookOpen,
	ChevronRight,
	Copy,
	Dice5,
	LayoutDashboard,
	ListMusic,
	Monitor,
	Palette,
	PencilRuler,
	Plus,
	ScrollText,
	Shuffle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { addUserDevice } from "@/app/actions/device";
import type { ComponentConfig } from "@/components/client-sidebar";
import { NavUser } from "@/components/nav-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { Device, RecipeSidebarItem } from "@/lib/types";
import packageJson from "@/package.json";
import { getDeviceStatus } from "@/utils/helpers";

interface AppSidebarProps {
	devices: Device[];
	recipeSidebarItems: RecipeSidebarItem[];
	toolsComponents: [string, ComponentConfig][];
	currentPath: string;
	user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string;
	} | null;
	authEnabled: boolean;
}

export function AppSidebar({
	devices,
	recipeSidebarItems,
	toolsComponents,
	currentPath,
	user,
	authEnabled,
}: AppSidebarProps) {
	const router = useRouter();

	// Add device dialog state
	const [addDeviceOpen, setAddDeviceOpen] = useState(false);
	const [newDeviceApiKey, setNewDeviceApiKey] = useState("");
	const [newDeviceName, setNewDeviceName] = useState("");
	const [addingDevice, setAddingDevice] = useState(false);

	const generateRandomApiKey = () => {
		const chars =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let key = "";
		for (let i = 0; i < 22; i++) {
			key += chars[Math.floor(Math.random() * chars.length)];
		}
		setNewDeviceApiKey(key);
	};

	const handleAddDevice = async () => {
		setAddingDevice(true);
		try {
			const result = await addUserDevice({
				apiKey: newDeviceApiKey,
				name: newDeviceName || undefined,
			});
			if (result.success) {
				toast.success(`Device added! API key: ${result.apiKey}`);
				setAddDeviceOpen(false);
				setNewDeviceApiKey("");
				setNewDeviceName("");
				router.refresh();
			} else {
				toast.error(result.error || "Failed to add device");
			}
		} catch {
			toast.error("Failed to add device");
		} finally {
			setAddingDevice(false);
		}
	};

	// Track collapsible states
	const [devicesOpen, setDevicesOpen] = useState(true);
	const [recipesOpen, setRecipesOpen] = useState(
		currentPath.startsWith("/recipes"),
	);
	const [toolsOpen, setToolsOpen] = useState(currentPath.startsWith("/tools"));

	// Open sections when navigating to them
	useEffect(() => {
		if (currentPath.startsWith("/device/")) setDevicesOpen(true);
		if (currentPath.startsWith("/recipes")) setRecipesOpen(true);
		if (currentPath.startsWith("/tools")) setToolsOpen(true);
	}, [currentPath]);

	const prefetch = useCallback(
		(path: string) => {
			router.prefetch(path);
		},
		[router],
	);

	return (
		<>
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/">
								<Image
									src="/trmnl-icons/trmnl-icon--white.svg"
									alt="TRMNL"
									width={32}
									height={32}
									className="rounded-lg"
								/>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-semibold">TRMNL BYOS</span>
									<Badge
										variant="secondary"
										className="w-fit text-[10px] px-1 py-0"
									>
										beta
									</Badge>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{/* Overview */}
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={currentPath === "/"}
									onMouseEnter={() => prefetch("/")}
									tooltip="Overview"
								>
									<Link href="/">
										<LayoutDashboard />
										<span>Overview</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Devices */}
							<Collapsible
								open={devicesOpen}
								onOpenChange={setDevicesOpen}
								className="group/collapsible"
							>
								<SidebarMenuItem>
									<div className="flex items-center">
										<CollapsibleTrigger asChild>
											<SidebarMenuButton tooltip="Devices" className="flex-1">
												<Monitor />
												<span>Devices</span>
												<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
											</SidebarMenuButton>
										</CollapsibleTrigger>
										{authEnabled && (
											<Button
												variant="ghost"
												size="icon"
												className="size-6 shrink-0 mr-1"
												onClick={(e) => {
													e.stopPropagation();
													setAddDeviceOpen(true);
												}}
											>
												<Plus className="size-3.5" />
												<span className="sr-only">Add device</span>
											</Button>
										)}
									</div>
									<CollapsibleContent>
										<SidebarMenuSub>
											{devices.length > 0 ? (
												devices.map((device) => (
													<DeviceSubItem
														key={device.id}
														device={device}
														currentPath={currentPath}
														prefetch={prefetch}
													/>
												))
											) : (
												<SidebarMenuSubItem>
													<span className="text-sm text-muted-foreground pl-2 py-1">
														No devices found
													</span>
												</SidebarMenuSubItem>
											)}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>

							{/* Recipes */}
							<Collapsible
								open={recipesOpen}
								onOpenChange={setRecipesOpen}
								className="group/collapsible"
							>
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton
											isActive={currentPath.startsWith("/recipes")}
											tooltip="Recipes"
										>
											<Palette />
											<span>Recipes</span>
											<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
										</SidebarMenuButton>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											<SidebarMenuSubItem>
												<SidebarMenuSubButton
													asChild
													isActive={currentPath === "/recipes"}
													onMouseEnter={() => prefetch("/recipes")}
												>
													<Link href="/recipes">
														<span>All Recipes</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
											{recipeSidebarItems.map((recipe) => (
												<SidebarMenuSubItem key={recipe.slug}>
													<SidebarMenuSubButton
														asChild
														isActive={currentPath === `/recipes/${recipe.slug}`}
														onMouseEnter={() =>
															prefetch(`/recipes/${recipe.slug}`)
														}
													>
														<Link href={`/recipes/${recipe.slug}`}>
															<span>{recipe.name}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>

							{/* Playlists */}
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={currentPath === "/playlists"}
									onMouseEnter={() => prefetch("/playlists")}
									tooltip="Playlists"
								>
									<Link href="/playlists">
										<ListMusic />
										<span>Playlists</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Mixup */}
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={currentPath === "/mixup"}
									onMouseEnter={() => prefetch("/mixup")}
									tooltip="Mixup"
								>
									<Link href="/mixup">
										<Shuffle />
										<span>Mixup</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Catalog */}
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={currentPath === "/catalog"}
									onMouseEnter={() => prefetch("/catalog")}
									tooltip="Catalog"
								>
									<Link href="/catalog">
										<BookOpen />
										<span>Catalog</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>

							{/* Tools */}
							<Collapsible
								open={toolsOpen}
								onOpenChange={setToolsOpen}
								className="group/collapsible"
							>
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton
											isActive={currentPath.startsWith("/tools")}
											tooltip="Tools"
										>
											<PencilRuler />
											<span>Tools</span>
											<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
										</SidebarMenuButton>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											<SidebarMenuSubItem>
												<SidebarMenuSubButton
													asChild
													isActive={currentPath === "/tools"}
													onMouseEnter={() => prefetch("/tools")}
												>
													<Link href="/tools">
														<span>All Tools</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
											{toolsComponents.map(([slug, config]) => (
												<SidebarMenuSubItem key={slug}>
													<SidebarMenuSubButton
														asChild
														isActive={currentPath === `/tools/${slug}`}
														onMouseEnter={() => prefetch(`/tools/${slug}`)}
													>
														<Link href={`/tools/${slug}`}>
															<span>{config.title}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>

							{/* System Log */}
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									isActive={currentPath === "/system-logs"}
									onMouseEnter={() => prefetch("/system-logs")}
									tooltip="System Log"
								>
									<Link href="/system-logs">
										<ScrollText />
										<span>System Log</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				{authEnabled && user && <NavUser user={user} />}
				<div className="flex items-center gap-2 px-2 py-1.5">
					<Image
						src="/trmnl-glyphs/trmnl-glyph--brand.svg"
						alt="TRMNL"
						width={24}
						height={24}
						className="opacity-50"
					/>
					<span className="text-xs text-muted-foreground font-mono">
						v{packageJson.version}
					</span>
				</div>
			</SidebarFooter>
		</Sidebar>

		{/* Add Device Dialog */}
		<Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add a Device</DialogTitle>
					<DialogDescription>
						Enter an API key for your new device. When the physical device
						connects via setup, its MAC address will be linked automatically.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="device-api-key">API Key</Label>
						<div className="flex gap-2">
							<Input
								id="device-api-key"
								value={newDeviceApiKey}
								onChange={(e) => setNewDeviceApiKey(e.target.value)}
								placeholder="Enter or generate an API key"
							/>
							<Button
								variant="outline"
								size="icon"
								onClick={generateRandomApiKey}
								title="Generate random key"
							>
								<Dice5 className="size-4" />
							</Button>
							{newDeviceApiKey && (
								<Button
									variant="outline"
									size="icon"
									onClick={() => {
										navigator.clipboard.writeText(newDeviceApiKey);
										toast.success("API key copied!");
									}}
									title="Copy API key"
								>
									<Copy className="size-4" />
								</Button>
							)}
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="device-name">
							Device Name{" "}
							<span className="text-muted-foreground">(optional)</span>
						</Label>
						<Input
							id="device-name"
							value={newDeviceName}
							onChange={(e) => setNewDeviceName(e.target.value)}
							placeholder="My TRMNL Device"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setAddDeviceOpen(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={handleAddDevice}
						disabled={addingDevice || !newDeviceApiKey.trim()}
					>
						{addingDevice ? "Adding..." : "Add Device"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}

// Device sub-item with status indicator
function DeviceSubItem({
	device,
	currentPath,
	prefetch,
}: {
	device: Device;
	currentPath: string;
	prefetch: (path: string) => void;
}) {
	const [status, setStatus] = useState(getDeviceStatus(device));

	useEffect(() => {
		setStatus(getDeviceStatus(device));
		const interval = setInterval(() => {
			setStatus(getDeviceStatus(device));
		}, 30000);
		return () => clearInterval(interval);
	}, [device]);

	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton
				asChild
				isActive={currentPath === `/device/${device.friendly_id}`}
				onMouseEnter={() => prefetch(`/device/${device.friendly_id}`)}
			>
				<Link href={`/device/${device.friendly_id}`}>
					<span className="flex items-center gap-2">
						{device.name}
						<StatusIndicator
							status={status as "online" | "offline"}
							size="sm"
						/>
					</span>
				</Link>
			</SidebarMenuSubButton>
		</SidebarMenuSubItem>
	);
}
