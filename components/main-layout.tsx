"use client";

import type React from "react";
import { useState, useEffect, useRef, Suspense, use, memo, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
	ChevronDown,
	ChevronRight,
	Github,
	Menu,
	Monitor,
	Moon,
	Server,
	Sun,
	X,
	Palette,
	Wrench,
	PencilRuler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { Device } from "@/lib/supabase/types";
import { getDeviceStatus } from "@/utils/helpers";
import Link from "next/link";
import screens from "@/app/recipes/screens.json";
import tools from "@/app/tools/tools.json";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

// Loading fallbacks for different sections
const DeviceListFallback = () => (
	<div className="pl-6 space-y-2">
		{[1, 2, 3, 4].map((i) => (
			<div key={i} className="flex items-center w-full py-1">
				<div className="w-full flex items-center">
					<Skeleton className="h-5 w-[85%] rounded-md" />
					<Skeleton className="h-3 w-3 ml-2 rounded-full" />
				</div>
			</div>
		))}
	</div>
);

const RecipesListFallback = () => (
	<div className="pl-6 space-y-2">
		<div className="flex items-center w-full py-1">
			<Skeleton className="h-5 w-[70%] rounded-md" />
		</div>
		{[1, 2, 3, 4].map((i) => (
			<div key={i} className="flex items-center w-full py-1">
				<Skeleton className="h-5 w-[85%] rounded-md" />
			</div>
		))}
	</div>
);

// Main navigation skeleton for the entire sidebar
const SidebarSkeletonFallback = () => (
	<div className="p-2 space-y-2">
		{/* Overview button */}
		<div className="w-full h-9 flex items-center">
			<Skeleton className="size-4 mr-2 rounded-md" />
			<Skeleton className="h-5 w-24 rounded-md" />
		</div>

		{/* Devices section */}
		<div className="w-full h-9 flex items-center justify-between">
			<div className="flex items-center">
				<Skeleton className="size-4 mr-2 rounded-md" />
				<Skeleton className="h-5 w-20 rounded-md" />
			</div>
			<Skeleton className="size-4 rounded-md" />
		</div>

		{/* Recipes section */}
		<div className="w-full h-9 flex items-center justify-between">
			<div className="flex items-center">
				<Skeleton className="size-4 mr-2 rounded-md" />
				<Skeleton className="h-5 w-24 rounded-md" />
			</div>
			<Skeleton className="size-4 rounded-md" />
		</div>

		{/* System Log button */}
		<div className="w-full h-9 flex items-center">
			<Skeleton className="size-4 mr-2 rounded-md" />
			<Skeleton className="h-5 w-28 rounded-md" />
		</div>

		{/* Maintenance button */}
		<div className="w-full h-9 flex items-center">
			<Skeleton className="size-4 mr-2 rounded-md" />
			<Skeleton className="h-5 w-28 rounded-md" />
		</div>
	</div>
);

// Single device item component that handles its own status
const DeviceItem = memo(({ 
	device, 
	currentPath
}: { 
	device: Device,
	currentPath: string
}) => {
	const [status, setStatus] = useState(getDeviceStatus(device));
	const isActive = currentPath === `/device/${device.friendly_id}`;
	
	// Update status periodically without causing parent re-renders
	useEffect(() => {
		// Set initial status
		setStatus(getDeviceStatus(device));
		
		// Check status every 30 seconds
		const interval = setInterval(() => {
			setStatus(getDeviceStatus(device));
		}, 30000);
		
		return () => clearInterval(interval);
	}, [device]);
	
	return (
		<Button
			key={device.id}
			variant="ghost"
			size="sm"
			className={`w-full justify-start space-x-0 text-sm h-8 ${isActive ? "bg-muted" : ""}`}
			asChild
		>
			<Link href={`/device/${device.friendly_id}`}>
				<div className="flex items-center w-full">
					<span className="truncate text-xs">{device.name}</span>
					<StatusIndicator
						status={status as "online" | "offline"}
						size="sm"
						className="ml-1"
					/>
				</div>
			</Link>
		</Button>
	);
});

DeviceItem.displayName = "DeviceItem";

// NavLink component to handle its own active state
const NavLink = memo(({ 
	href, 
	currentPath, 
	icon, 
	label 
}: { 
	href: string, 
	currentPath: string, 
	icon: React.ReactNode, 
	label: string 
}) => {
	const isActive = currentPath === href;
	
	return (
		<Button
			variant="ghost"
			className={`w-full justify-start gap-x-0 text-sm h-9 ${isActive ? "bg-muted" : ""}`}
			asChild
		>
			<Link href={href}>
				{icon}
				{label}
			</Link>
		</Button>
	);
});

NavLink.displayName = "NavLink";

// Recipe item component that handles its own active state
const RecipeItem = memo(({
	slug,
	config,
	currentPath
}: {
	slug: string,
	config: typeof screens[keyof typeof screens],
	currentPath: string
}) => {
	const isActive = currentPath === `/recipes/${slug}`;
	
	return (
		<Button
			key={slug}
			variant="ghost"
			size="sm"
			className={`w-full justify-start space-x-0 text-sm h-8 ${isActive ? "bg-muted" : ""}`}
			asChild
		>
			<Link href={`/recipes/${slug}`}>
				<span className="truncate text-xs">{config.title}</span>
			</Link>
		</Button>
	);
});

RecipeItem.displayName = "RecipeItem";

// Device list component to wrap in Suspense
const DeviceList = memo(({
	devices,
	currentPath,
}: {
	devices: Device[];
	currentPath: string;
}) => {
	return (
		<>
			{Array.isArray(devices) ? (
				devices.map((device) => (
					<DeviceItem
						key={device.id}
						device={device}
						currentPath={currentPath}
					/>
				))
			) : (
				<div className="pl-6 space-y-2">No devices found</div>
			)}
		</>
	);
});

DeviceList.displayName = "DeviceList";

// Recipes list component to wrap in Suspense
const RecipesList = memo(({
	components,
	currentPath,
}: {
	components: [string, (typeof screens)[keyof typeof screens]][];
	currentPath: string;
}) => {
	const isAllRecipesActive = currentPath === "/recipes";
	
	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className={`w-full justify-start space-x-0 text-sm h-8 ${isAllRecipesActive ? "bg-muted" : ""}`}
				asChild
			>
				<Link href="/recipes">
					<span className="truncate text-xs">All Recipes</span>
				</Link>
			</Button>

			{components.map(([slug, config]) => (
				<RecipeItem 
					key={slug}
					slug={slug}
					config={config}
					currentPath={currentPath}
				/>
			))}
		</>
	);
});

RecipesList.displayName = "RecipesList";

// Self-contained collapsible section component for devices
const DevicesSection = memo(({ 
	devices, 
	currentPath,
	initialOpen = false
}: { 
	devices: Device[],
	currentPath: string,
	initialOpen?: boolean
}) => {
	const [isOpen, setIsOpen] = useState(initialOpen);
	
	// Open devices section if a device page is active
	useEffect(() => {
		if (currentPath.startsWith("/device/")) {
			setIsOpen(true);
		}
	}, [currentPath]);
	
	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="w-full"
		>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className="w-full justify-between text-sm h-9"
				>
					<div className="flex items-center">
						<Monitor className="mr-2 size-4" />
						Devices
					</div>
					{isOpen ? (
						<ChevronDown className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					)}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="pl-6 space-y-1">
				<Suspense fallback={<DeviceListFallback />}>
					<DeviceList
						devices={devices}
						currentPath={currentPath}
					/>
				</Suspense>
			</CollapsibleContent>
		</Collapsible>
	);
});

DevicesSection.displayName = "DevicesSection";

// Self-contained collapsible section component for recipes
const RecipesSection = memo(({ 
	components, 
	currentPath,
	initialOpen = false
}: { 
	components: [string, (typeof screens)[keyof typeof screens]][],
	currentPath: string,
	initialOpen?: boolean
}) => {
	const [isOpen, setIsOpen] = useState(initialOpen);
	const isRecipesPath = currentPath === "/recipes" || currentPath.startsWith("/recipes/");
	
	// Open recipes section if a recipes page is active
	useEffect(() => {
		if (currentPath.startsWith("/recipes/")) {
			setIsOpen(true);
		}
	}, [currentPath]);
	
	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="w-full"
		>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className={`w-full justify-between text-sm h-9 ${isRecipesPath ? "bg-muted" : ""}`}
				>
					<div className="flex items-center">
						<Palette className="mr-2 size-4" />
						Recipes
					</div>
					{isOpen ? (
						<ChevronDown className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					)}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="pl-6 space-y-1">
				<Suspense fallback={<RecipesListFallback />}>
					<RecipesList
						components={components}
						currentPath={currentPath}
					/>
				</Suspense>
			</CollapsibleContent>
		</Collapsible>
	);
});

RecipesSection.displayName = "RecipesSection";

// Self-contained collapsible section component for tools
const ToolsSection = memo(({ 
	currentPath,
	initialOpen = false
}: { 
	currentPath: string,
	initialOpen?: boolean
}) => {
	const [isOpen, setIsOpen] = useState(initialOpen);
	const isToolsPath = currentPath === "/tools" || currentPath.startsWith("/tools/");
	
	// Open tools section if a tools page is active
	useEffect(() => {
		if (currentPath.startsWith("/tools/")) {
			setIsOpen(true);
		}
	}, [currentPath]);

	// Memoize tools components to prevent recalculation on every render
	const toolsComponents = useMemo(() => {
		return Object.entries(tools)
			.filter(
				([, config]) => process.env.NODE_ENV !== "production" || config.published,
			)
			.sort((a, b) => a[1].title.localeCompare(b[1].title));
	}, []);
	
	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="w-full"
		>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className={`w-full justify-between text-sm h-9 ${isToolsPath ? "bg-muted" : ""}`}
				>
					<div className="flex items-center">
						<PencilRuler className="mr-2 size-4" />
						Tools
					</div>
					{isOpen ? (
						<ChevronDown className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					)}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="pl-6 space-y-1">
				<Button
					variant="ghost"
					size="sm"
					className={`w-full justify-start space-x-0 text-sm h-8 ${currentPath === "/tools" ? "bg-muted" : ""}`}
					asChild
				>
					<Link href="/tools">
						<span className="truncate text-xs">All Tools</span>
					</Link>
				</Button>
				{toolsComponents.map(([slug, config]) => (
					<Button
						key={slug}
						variant="ghost"
						size="sm"
						className={`w-full justify-start space-x-0 text-sm h-8 ${currentPath === `/tools/${slug}` ? "bg-muted" : ""}`}
						asChild
					>
						<Link href={`/tools/${slug}`}>
							<span className="truncate text-xs">{config.title}</span>
						</Link>
					</Button>
				))}
			</CollapsibleContent>
		</Collapsible>
	);
});

ToolsSection.displayName = "ToolsSection";

// Sidebar navigation component to prevent main layout rerenders
const SidebarNavigation = memo(({
	devices,
	recipesComponents,
	currentPath,
}: {
	devices: Device[];
	recipesComponents: [string, (typeof screens)[keyof typeof screens]][];
	currentPath: string;
}) => {
	return (
		<nav className="p-2 space-y-1">
			<NavLink 
				href="/" 
				currentPath={currentPath} 
				icon={<Server className="mr-2 size-4" />} 
				label="Overview" 
			/>

			<DevicesSection 
				devices={devices} 
				currentPath={currentPath}
				initialOpen={true}
			/>

			<RecipesSection 
				components={recipesComponents}
				currentPath={currentPath}
				initialOpen={currentPath.startsWith("/recipes/")}
			/>
			
			<ToolsSection
				currentPath={currentPath}
				initialOpen={currentPath.startsWith("/tools/")}
			/>

			<NavLink
				href="/system-logs"
				currentPath={currentPath}
				icon={<Server className="mr-2 size-4" />}
				label="System Log"
			/>

			<NavLink
				href="/maintenance"
				currentPath={currentPath}
				icon={<Wrench className="mr-2 size-4" />}
				label="Maintenance"
			/>
		</nav>
	);
});

SidebarNavigation.displayName = "SidebarNavigation";

interface MainLayoutProps {
	children: React.ReactNode;
	devicesPromise: Promise<Device[]>;
}

export default function MainLayout({
	children,
	devicesPromise,
}: MainLayoutProps) {
	const devices = use(devicesPromise);
	const pathname = usePathname();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const mainRef = useRef<HTMLDivElement>(null);
	const { theme, setTheme } = useTheme();

	// Toggle theme - memoize this callback
	const toggleTheme = useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [theme, setTheme]);

	// Close sidebar when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isSidebarOpen &&
				sidebarRef.current &&
				!sidebarRef.current.contains(event.target as Node) &&
				mainRef.current &&
				mainRef.current.contains(event.target as Node)
			) {
				setIsSidebarOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isSidebarOpen]);

	// Memoize recipes components to prevent recalculation on every render
	const recipesComponents = useMemo(() => {
		return Object.entries(screens)
			.filter(
				([, config]) => process.env.NODE_ENV !== "production" || config.published,
			)
			.sort((a, b) => a[1].title.localeCompare(b[1].title));
	}, []);

	// Memoize the handler for sidebar toggle
	const handleSidebarToggle = useCallback(() => {
		setIsSidebarOpen(prev => !prev);
	}, []);
	
	// Memoize the handler for sidebar close
	const handleSidebarClose = useCallback(() => {
		setIsSidebarOpen(false);
	}, []);

	return (
		<div className="min-h-screen flex flex-col">
			<header className="border-b bg-background">
				<div className="flex items-center px-0 md:px-5">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={handleSidebarToggle}
					>
						<Menu className="size-5" />
						<span className="sr-only">Toggle Menu</span>
					</Button>
					<div className="flex items-center gap-2">
						<h1 className="text-base md:text-lg font-semibold">byos-nextjs</h1>
						<span className="text-red-500 font-mono font-bold text-xs -ml-2 -mt-4 align-text-top">
							alpha
						</span>
						<h1 className="text-base md:text-lg font-semibold">
							for{" "}
							<Link
								href="https://usetrmnl.com"
								target="_blank"
								rel="noopener noreferrer"
							>
								TRMNL
							</Link>
						</h1>
					</div>
					<div className="ml-auto flex items-center space-x-0 md:space-x-2">
						<Button variant="ghost" size="icon" onClick={toggleTheme}>
							<Sun className="size-5 dark:hidden" />{" "}
							<Moon className="size-5 hidden dark:block" />
						</Button>
						<Button variant="ghost" size="icon" asChild>
							<Link
								href="https://github.com/usetrmnl/byos_next"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Github className="size-5" />
							</Link>
						</Button>
					</div>
				</div>
			</header>
			<div className="flex flex-1">
				<aside
					ref={sidebarRef}
					className={`${
						isSidebarOpen ? "translate-x-0" : "-translate-x-full"
					} fixed inset-y-0 z-50 flex w-56 flex-col border-r bg-background transition-transform md:translate-x-0 md:relative`}
				>
					<div className="md:hidden flex justify-end p-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleSidebarClose}
						>
							<X className="size-5" />
						</Button>
					</div>
					<div className="flex-1">
						<Suspense fallback={<SidebarSkeletonFallback />}>
							<SidebarNavigation
								devices={devices}
								recipesComponents={recipesComponents}
								currentPath={pathname}
							/>
						</Suspense>
					</div>
				</aside>
				<main ref={mainRef} className="w-full max-w-6xl p-2 md:p-4 lg:p-6">
					{children}
				</main>
			</div>
			<footer className="border-t bg-background py-2 px-0 md:px-5 text-sm text-muted-foreground">
				<div className="flex flex-col md:flex-row justify-between items-center">
					<div className="flex items-center gap-2">
						<span className="text-base md:text-lg font-semibold">byos-nextjs</span>
						<span className="text-red-500 font-mono font-bold text-xs -ml-2 -mt-4 align-text-top">
							alpha
						</span>
						<h1 className="text-base md:text-lg font-semibold">
							for{" "}
						<Link
							href="https://usetrmnl.com"
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-foreground"
						>
							TRMNL
						</Link>
						</h1>
					</div>
					<div className="text-xs md:text-sm">
						<span>Found an issue? </span>
						<Link
							href="https://github.com/usetrmnl/byos_next/issues"
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-foreground"
						>
							Open a GitHub issue
						</Link>
						<span>
							{" "}
							or{" "}
							<Link
								href="mailto:manglekuo@gmail.com?subject=BYOS%20Next.js%20v0.1.0%20Feedback"
								className="underline hover:text-foreground"
							>
								email with screenshots
							</Link>
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
