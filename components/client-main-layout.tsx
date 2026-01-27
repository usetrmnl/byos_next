"use client";

import { Github, Moon, Search, Sun } from "lucide-react";
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
import type { Device } from "@/lib/types";

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
	recipesComponents: [string, ComponentConfig][];
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
	recipesComponents,
	toolsComponents,
	user,
	authEnabled,
}: ClientMainLayoutProps) {
	const pathname = usePathname();
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

	return (
		<SidebarProvider>
			{/* Sidebar */}
			<AppSidebar
				devices={devices}
				currentPath={pathname}
				recipesComponents={recipesComponents}
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
								<Github className="size-5" />
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
				recipesComponents={recipesComponents}
				toolsComponents={toolsComponents}
			/>
		</SidebarProvider>
	);
}
