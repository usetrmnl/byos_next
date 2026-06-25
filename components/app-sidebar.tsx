"use client";

import {
	BookOpen,
	ChevronRight,
	Copy,
	Dice5,
	Info,
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
import { addUserDevice, claimDeviceByCode } from "@/app/actions/device";
import { StatusIndicator } from "@/components/common/status-indicator";
import type { ComponentConfig } from "@/components/component-config";
import { NavUser } from "@/components/nav-user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { formatByosApiServerUrlForDevice } from "@/lib/byos-api-server-url";
import type { Device, RecipeSidebarItem } from "@/lib/types";
import packageJson from "@/package.json";
import { generateRandomApiKey, getDeviceStatus } from "@/utils/helpers";

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
	byosApiServerUrl: string;
}

export function AppSidebar({
	devices,
	recipeSidebarItems,
	toolsComponents,
	currentPath,
	user,
	authEnabled,
	byosApiServerUrl,
}: AppSidebarProps) {
	const router = useRouter();

	// Add device dialog state
	const [addDeviceOpen, setAddDeviceOpen] = useState(false);
	const [newDeviceApiKey, setNewDeviceApiKey] = useState("");
	const [newDeviceMacAddress, setNewDeviceMacAddress] = useState("");
	const [newDeviceClaimCode, setNewDeviceClaimCode] = useState("");
	const [newDeviceName, setNewDeviceName] = useState("");
	const [addingDevice, setAddingDevice] = useState(false);
	const deviceApiServerUrl = formatByosApiServerUrlForDevice(byosApiServerUrl);

	const generateRandomDeviceApiKey = () => {
		setNewDeviceApiKey(generateRandomApiKey());
	};

	const handleAddDevice = async () => {
		setAddingDevice(true);
		try {
			const claimCode = newDeviceClaimCode.trim();
			if (claimCode) {
				const result = await claimDeviceByCode({
					claimCode,
					name: newDeviceName || undefined,
				});
				if (result.success) {
					toast.success("Device claimed!");
					setAddDeviceOpen(false);
					setNewDeviceApiKey("");
					setNewDeviceMacAddress("");
					setNewDeviceClaimCode("");
					setNewDeviceName("");
					router.refresh();
				} else {
					toast.error(result.error || "Failed to claim device");
				}
				return;
			}

			const result = await addUserDevice({
				apiKey: newDeviceApiKey,
				macAddress: newDeviceMacAddress || undefined,
				name: newDeviceName || undefined,
			});
			if (result.success) {
				toast.success(`Device added! API key: ${result.apiKey}`);
				setAddDeviceOpen(false);
				setNewDeviceApiKey("");
				setNewDeviceMacAddress("");
				setNewDeviceClaimCode("");
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
															isActive={
																currentPath === `/recipes/${recipe.slug}`
															}
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
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Add or Claim a Device</DialogTitle>
						<DialogDescription>
							Point your device at this server during WiFi setup, then claim it
							with an on-screen code or add it manually with an API key.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Alert>
							<Info aria-hidden="true" />
							<AlertTitle>Point the device API server here</AlertTitle>
							<AlertDescription>
								<ol className="list-decimal space-y-1 pl-4">
									<li>
										Hold the back button for 5 seconds to reset the device.
									</li>
									<li>
										Connect to the <strong>TRMNL</strong> WiFi network and open
										the captive portal.
									</li>
									<li>
										Scroll to the bottom of the WiFi list and tap{" "}
										<strong>Advanced</strong>.
									</li>
									<li>
										Tap <strong>Custom Server</strong>, then{" "}
										<strong>Yes</strong> on the warning.
									</li>
									<li>
										In the <strong>API Server</strong> field, enter your server
										URL with no trailing slash:
									</li>
								</ol>
								<div className="mt-2 flex gap-2">
									<code className="flex-1 break-all rounded-md border bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
										{deviceApiServerUrl.displayUrl}
									</code>
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => {
											if (deviceApiServerUrl.usesLocalhost) {
												toast.message(
													"Replace [your-ip] with your computer's LAN IP address.",
												);
												return;
											}
											navigator.clipboard.writeText(
												deviceApiServerUrl.displayUrl,
											);
											toast.success("API server URL copied!");
										}}
										title="Copy API server URL"
										aria-label="Copy API server URL"
									>
										<Copy className="size-4" />
									</Button>
								</div>
								{deviceApiServerUrl.usesLocalhost && (
									<p className="mt-2 text-xs text-muted-foreground">
										Do not use <strong>localhost</strong> — use your
										computer&apos;s LAN IP on the same WiFi network (for example{" "}
										<code className="font-mono">192.168.1.42</code>).
									</p>
								)}
								<ol className="mt-3 list-decimal space-y-1 pl-4" start={6}>
									<li>
										Scroll down and tap <strong>Back to Wi-Fi</strong>.
									</li>
									<li>Select your WiFi network and enter the password.</li>
									<li>
										Tap <strong>Connect</strong>, wait, and the device should
										refresh.
									</li>
								</ol>
							</AlertDescription>
						</Alert>

						<div className="space-y-2">
							<Label htmlFor="device-claim-code">Claim Code</Label>
							<Input
								id="device-claim-code"
								value={newDeviceClaimCode}
								onChange={(e) =>
									setNewDeviceClaimCode(e.target.value.toUpperCase())
								}
								placeholder="AB12-CD34"
							/>
							<p className="text-xs text-muted-foreground">
								Use this when an unclaimed TRMNL shows a claim code on screen.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="device-mac-address">
								MAC Address{" "}
								<span className="text-muted-foreground">(recommended)</span>
							</Label>
							<Input
								id="device-mac-address"
								value={newDeviceMacAddress}
								onChange={(e) =>
									setNewDeviceMacAddress(e.target.value.toUpperCase())
								}
								placeholder="D8:3B:DA:F3:97:B4"
								autoComplete="off"
								spellCheck={false}
							/>
							<p className="text-xs text-muted-foreground">
								Copy from{" "}
								<a
									href="https://trmnl.com/devices/"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2 hover:text-foreground"
								>
									trmnl.com/devices
								</a>
								. TRMNL firmware calls{" "}
								<code className="font-mono">/api/setup</code> with MAC only, so
								BYOS needs the hardware address to recognize devices you import
								from the TRMNL cloud.
							</p>
						</div>
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
									onClick={generateRandomDeviceApiKey}
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
							<p className="text-xs text-muted-foreground">
								You can also find your API key at{" "}
								<a
									href="https://trmnl.com/devices/"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-2 hover:text-foreground"
								>
									trmnl.com/devices
								</a>{" "}
								under Developer Perks.
							</p>
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
						<Button variant="outline" onClick={() => setAddDeviceOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleAddDevice}
							disabled={
								addingDevice ||
								(!newDeviceApiKey.trim() && !newDeviceClaimCode.trim())
							}
						>
							{addingDevice
								? newDeviceClaimCode.trim()
									? "Claiming..."
									: "Adding..."
								: newDeviceClaimCode.trim()
									? "Claim Device"
									: "Add Device"}
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
	const status = getDeviceStatus(device);

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
