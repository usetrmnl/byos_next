"use client";

import {
	FileText,
	Home,
	ListRestart,
	Monitor,
	Palette,
	PanelsTopLeft,
	PencilRuler,
	Server,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ComponentConfig } from "@/components/client-sidebar";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import type { Device } from "@/lib/types";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	devices: Device[];
	recipesComponents: [string, ComponentConfig][];
	toolsComponents: [string, ComponentConfig][];
}

export function CommandPalette({
	open,
	onOpenChange,
	devices,
	recipesComponents,
	toolsComponents,
}: CommandPaletteProps) {
	const router = useRouter();
	const [search, setSearch] = useState("");

	// Global keyboard shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				onOpenChange(!open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [open, onOpenChange]);

	const runCommand = useCallback(
		(command: () => void) => {
			onOpenChange(false);
			command();
		},
		[onOpenChange],
	);

	const navigateTo = useCallback(
		(path: string) => {
			runCommand(() => router.push(path));
		},
		[router, runCommand],
	);

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Command Palette"
			description="Search for devices, recipes, tools, and navigation"
		>
			<CommandInput
				placeholder="Type a command or search..."
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>

				<CommandGroup heading="Navigation">
					<CommandItem onSelect={() => navigateTo("/")}>
						<Home className="mr-2 size-4" />
						<span>Overview</span>
					</CommandItem>
					<CommandItem onSelect={() => navigateTo("/playlists")}>
						<ListRestart className="mr-2 size-4" />
						<span>Playlists</span>
					</CommandItem>
					<CommandItem onSelect={() => navigateTo("/mixup")}>
						<PanelsTopLeft className="mr-2 size-4" />
						<span>Mixup</span>
					</CommandItem>
					<CommandItem onSelect={() => navigateTo("/system-logs")}>
						<Server className="mr-2 size-4" />
						<span>System Log</span>
					</CommandItem>
				</CommandGroup>

				<CommandSeparator />

				<CommandGroup heading={`Devices (${devices.length})`}>
					{devices.map((device) => (
						<CommandItem
							key={device.id}
							onSelect={() => navigateTo(`/device/${device.friendly_id}`)}
						>
							<Monitor className="mr-2 size-4" />
							<span>{device.name}</span>
							<span className="ml-2 text-xs text-muted-foreground">
								{device.friendly_id}
							</span>
						</CommandItem>
					))}
					{devices.length === 0 && (
						<CommandItem disabled>
							<span className="text-muted-foreground">No devices found</span>
						</CommandItem>
					)}
				</CommandGroup>

				<CommandSeparator />

				<CommandGroup heading="Recipes">
					<CommandItem onSelect={() => navigateTo("/recipes")}>
						<Palette className="mr-2 size-4" />
						<span>All Recipes</span>
					</CommandItem>
					{recipesComponents.map(([slug, config]) => (
						<CommandItem
							key={slug}
							onSelect={() => navigateTo(`/recipes/${slug}`)}
						>
							<FileText className="mr-2 size-4" />
							<span>{config.title}</span>
						</CommandItem>
					))}
				</CommandGroup>

				<CommandSeparator />

				<CommandGroup heading="Tools">
					<CommandItem onSelect={() => navigateTo("/tools")}>
						<PencilRuler className="mr-2 size-4" />
						<span>All Tools</span>
					</CommandItem>
					{toolsComponents.map(([slug, config]) => (
						<CommandItem
							key={slug}
							onSelect={() => navigateTo(`/tools/${slug}`)}
						>
							<FileText className="mr-2 size-4" />
							<span>{config.title}</span>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
