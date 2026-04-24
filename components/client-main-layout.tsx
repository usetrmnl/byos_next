"use client";

import { Moon, Search, Sun } from "lucide-react";

// GitHub brand icon (removed from lucide-react 1.x alongside other brand marks).
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
			<path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.77.12 3.06.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.21 0 .31.21.68.8.56 4.57-1.52 7.85-5.83 7.85-10.91C23.5 5.73 18.27.5 12 .5z" />
		</svg>
	);
}
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import type React from "react";
import { Suspense, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import type { ComponentConfig } from "@/components/client-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Device, RecipeSidebarItem } from "@/lib/types";

// Loading skeleton for main content
function MainContentSkeleton() {
	return (
		<div className="p-6 space-y-6">
			<Skeleton className="h-8 w-64" />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-32 rounded-lg" />
				))}
			</div>
		</div>
	);
}

interface ClientMainLayoutProps {
	children: React.ReactNode;
	devices: Device[];
	dbStatus: {
		ready: boolean;
		error?: string;
		PostgresUrl?: string;
	};
	recipeSidebarItems: RecipeSidebarItem[];
	toolsComponents: [string, ComponentConfig][];
	user: {
		name: string;
		email: string;
		image?: string | null;
		role?: string;
	} | null;
	authEnabled: boolean;
}

export function ClientMainLayout({
	children,
	devices,
	recipeSidebarItems,
	toolsComponents,
	user,
	authEnabled,
}: ClientMainLayoutProps) {
	const pathname = usePathname() ?? "/";
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

	return (
		<SidebarProvider>
			{/* Sidebar */}
			<AppSidebar
				devices={devices}
				currentPath={pathname}
				recipeSidebarItems={recipeSidebarItems}
				toolsComponents={toolsComponents}
				user={user}
				authEnabled={authEnabled}
			/>

			{/* Main area */}
			<SidebarInset>
				{/* Header */}
				<header className="flex h-14 items-center gap-2 border-b px-4">
					<SidebarTrigger />

					{/* Search */}
					<Button
						variant="outline"
						size="sm"
						className="ml-4 hidden md:flex gap-2 text-muted-foreground"
						onClick={() => setCommandPaletteOpen(true)}
					>
						<Search className="h-4 w-4" />
						<span>Search...</span>
						<kbd className="rounded border bg-muted px-1.5 text-[10px] font-mono">
							⌘K
						</kbd>
					</Button>

					{/* Right actions */}
					<div className="ml-auto flex items-center gap-1">
						<Button variant="ghost" size="icon" onClick={toggleTheme}>
							<Sun className="size-5 dark:hidden" />
							<Moon className="hidden size-5 dark:block" />
						</Button>

						<Button variant="ghost" size="icon" asChild>
							<Link
								href="https://github.com/usetrmnl/byos_next"
								target="_blank"
							>
								<GithubIcon className="size-5" />
							</Link>
						</Button>
					</div>
				</header>

				{/* Main content */}
				<main className="flex-1 overflow-auto">
					<div className="mx-auto max-w-6xl p-4 md:p-6">
						<Suspense fallback={<MainContentSkeleton />}>{children}</Suspense>
					</div>
				</main>
			</SidebarInset>

			{/* Command palette */}
			<CommandPalette
				open={commandPaletteOpen}
				onOpenChange={setCommandPaletteOpen}
				devices={devices}
				recipeSidebarItems={recipeSidebarItems}
				toolsComponents={toolsComponents}
			/>
		</SidebarProvider>
	);
}
