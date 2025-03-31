"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	ChevronDown,
	ChevronRight,
	Monitor,
	Server,
	Wrench,
	Palette,
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
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Define interfaces for screens and tools JSON
interface Author {
	name: string;
	github: string;
}

interface RecipeConfig {
	title: string;
	published: boolean;
	createdAt: string;
	updatedAt: string;
	description: string;
	componentPath: string;
	hasDataFetch: boolean;
	props: Record<string, unknown>;
	tags: string[];
	author: Author;
	renderSettings: Record<string, unknown>;
	version: string;
	category: string;
}

interface ToolConfig {
	title: string;
	published: boolean;
	createdAt: string;
	updatedAt: string;
	description: string;
	tags: string[];
	author: Author;
	version: string;
	category: string;
}

// Config type for components that can be either recipe or tool
export type ComponentConfig = RecipeConfig | ToolConfig;

// Loading fallbacks
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

// NavLink component
const NavLink = memo(
	({
		href,
		currentPath,
		icon,
		label,
	}: {
		href: string;
		currentPath: string;
		icon: React.ReactNode;
		label: string;
	}) => {
		const isActive = currentPath === href;
		const router = useRouter();

		// Handler to prefetch on hover
		const handleMouseEnter = useCallback(() => {
			router.prefetch(href);
		}, [router, href]);

		return (
			<Button
				variant="ghost"
				className={`w-full justify-start gap-x-0 text-sm h-9 ${isActive ? "bg-muted" : ""}`}
				asChild
				onMouseEnter={handleMouseEnter}
			>
				<Link href={href}>
					{icon}
					{label}
				</Link>
			</Button>
		);
	},
);

NavLink.displayName = "NavLink";

// Single device item component
const DeviceItem = memo(
	({
		device,
		currentPath,
	}: {
		device: Device;
		currentPath: string;
	}) => {
		const [status, setStatus] = useState(getDeviceStatus(device));
		const isActive = currentPath === `/device/${device.friendly_id}`;
		const router = useRouter();

		// Update status periodically
		useEffect(() => {
			setStatus(getDeviceStatus(device));

			const interval = setInterval(() => {
				setStatus(getDeviceStatus(device));
			}, 30000);

			return () => clearInterval(interval);
		}, [device]);

		// Prefetch on hover
		const handleMouseEnter = useCallback(() => {
			router.prefetch(`/device/${device.friendly_id}`);
		}, [router, device.friendly_id]);

		return (
			<Button
				key={device.id}
				variant="ghost"
				size="sm"
				className={`w-full justify-start space-x-0 text-sm h-8 ${isActive ? "bg-muted" : ""}`}
				asChild
				onMouseEnter={handleMouseEnter}
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
	},
);

DeviceItem.displayName = "DeviceItem";

// Recipe item component
const RecipeItem = memo(
	({
		slug,
		config,
		currentPath,
	}: {
		slug: string;
		config: ComponentConfig;
		currentPath: string;
	}) => {
		const isActive = currentPath === `/recipes/${slug}`;
		const router = useRouter();

		// Prefetch on hover
		const handleMouseEnter = useCallback(() => {
			router.prefetch(`/recipes/${slug}`);
		}, [router, slug]);

		return (
			<Button
				key={slug}
				variant="ghost"
				size="sm"
				className={`w-full justify-start space-x-0 text-sm h-8 ${isActive ? "bg-muted" : ""}`}
				asChild
				onMouseEnter={handleMouseEnter}
			>
				<Link href={`/recipes/${slug}`}>
					<span className="truncate text-xs">{config.title}</span>
				</Link>
			</Button>
		);
	},
);

RecipeItem.displayName = "RecipeItem";

// Device list component
const DeviceList = memo(
	({
		devices,
		currentPath,
	}: {
		devices: Device[];
		currentPath: string;
	}) => {
		return (
			<>
				{Array.isArray(devices) && devices.length > 0 ? (
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
	},
);

DeviceList.displayName = "DeviceList";

// Recipes list component
const RecipesList = memo(
	({
		components,
		currentPath,
	}: {
		components: [string, ComponentConfig][];
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
	},
);

RecipesList.displayName = "RecipesList";

// Devices section component
const DevicesSection = memo(
	({
		devices,
		currentPath,
		initialOpen = false,
	}: {
		devices: Device[];
		currentPath: string;
		initialOpen?: boolean;
	}) => {
		const [isOpen, setIsOpen] = useState(initialOpen);

		// Open devices section if a device page is active
		useEffect(() => {
			if (currentPath.startsWith("/device/")) {
				setIsOpen(true);
			}
		}, [currentPath]);

		return (
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
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
						<DeviceList devices={devices} currentPath={currentPath} />
					</Suspense>
				</CollapsibleContent>
			</Collapsible>
		);
	},
);

DevicesSection.displayName = "DevicesSection";

// Recipes section component
const RecipesSection = memo(
	({
		components,
		currentPath,
		initialOpen = false,
	}: {
		components: [string, ComponentConfig][];
		currentPath: string;
		initialOpen?: boolean;
	}) => {
		const [isOpen, setIsOpen] = useState(initialOpen);
		const isRecipesPath =
			currentPath === "/recipes" || currentPath.startsWith("/recipes/");

		// Open recipes section if a recipes page is active
		useEffect(() => {
			if (currentPath.startsWith("/recipes/")) {
				setIsOpen(true);
			}
		}, [currentPath]);

		return (
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
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
						<RecipesList components={components} currentPath={currentPath} />
					</Suspense>
				</CollapsibleContent>
			</Collapsible>
		);
	},
);

RecipesSection.displayName = "RecipesSection";

// Tools section component
const ToolsSection = memo(
	({
		toolsComponents,
		currentPath,
		initialOpen = false,
	}: {
		toolsComponents: [string, ComponentConfig][];
		currentPath: string;
		initialOpen?: boolean;
	}) => {
		const [isOpen, setIsOpen] = useState(initialOpen);
		const isToolsPath =
			currentPath === "/tools" || currentPath.startsWith("/tools/");

		// Open tools section if a tools page is active
		useEffect(() => {
			if (currentPath.startsWith("/tools/")) {
				setIsOpen(true);
			}
		}, [currentPath]);

		return (
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
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
	},
);

ToolsSection.displayName = "ToolsSection";

// Main ClientSidebar component
interface ClientSidebarProps {
	devices: Device[];
	recipesComponents: [string, ComponentConfig][];
	toolsComponents: [string, ComponentConfig][];
	currentPath: string;
}

export function ClientSidebar({
	devices,
	recipesComponents,
	toolsComponents,
	currentPath,
}: ClientSidebarProps) {
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
				toolsComponents={toolsComponents}
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
}
