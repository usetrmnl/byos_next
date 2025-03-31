"use client";

import type React from "react";
import { useState, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Github, Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Device } from "@/lib/supabase/types";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientSidebar } from "@/components/client-sidebar";
import type { ComponentConfig } from "@/components/client-sidebar";

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

// Main Content Fallback
const MainContentFallback = () => (
	<div className="p-6 space-y-6">
		{/* Header section */}
		<div className="flex justify-between items-center">
			<Skeleton className="h-8 w-64 rounded-md" />
			<div className="flex space-x-3">
				<Skeleton className="h-9 w-24 rounded-md" />
				<Skeleton className="h-9 w-24 rounded-md" />
			</div>
		</div>

		{/* Content cards */}
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{[1, 2, 3].map((i) => (
				<div key={i} className="border rounded-lg p-4 space-y-3">
					<div className="flex justify-between items-center">
						<Skeleton className="h-6 w-32 rounded-md" />
						<Skeleton className="h-4 w-4 rounded-full" />
					</div>
					<Skeleton className="h-4 w-full rounded-md" />
					<Skeleton className="h-4 w-3/4 rounded-md" />
					<Skeleton className="h-16 w-full rounded-md" />
				</div>
			))}
		</div>

		{/* Table or list section */}
		<div className="border rounded-lg p-4 space-y-4">
			<Skeleton className="h-7 w-48 rounded-md" />
			<div className="space-y-3">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="flex items-center justify-between py-2">
						<div className="flex items-center space-x-3">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-32 rounded-md" />
								<Skeleton className="h-3 w-24 rounded-md" />
							</div>
						</div>
						<Skeleton className="h-8 w-24 rounded-md" />
					</div>
				))}
			</div>
		</div>
	</div>
);

// Define the props interface with direct data instead of promises
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
}

export function ClientMainLayout({
	children,
	devices,
	recipesComponents,
	toolsComponents,
}: ClientMainLayoutProps) {
	const pathname = usePathname();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const mainRef = useRef<HTMLDivElement>(null);
	const { theme, setTheme } = useTheme();

	// Toggle theme
	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	// Close sidebar when clicking outside
	const handleSidebarToggle = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	const handleSidebarClose = () => {
		setIsSidebarOpen(false);
	};

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
						<Button variant="ghost" size="icon" onClick={handleSidebarClose}>
							<X className="size-5" />
						</Button>
					</div>
					<div className="flex-1">
						<Suspense fallback={<SidebarSkeletonFallback />}>
							<ClientSidebar
								devices={devices}
								currentPath={pathname}
								recipesComponents={recipesComponents}
								toolsComponents={toolsComponents}
							/>
						</Suspense>
					</div>
				</aside>
				<main ref={mainRef} className="w-full max-w-6xl p-2 md:p-4 lg:p-6">
					<Suspense fallback={<MainContentFallback />}>{children}</Suspense>
				</main>
			</div>
			<footer className="border-t bg-background py-2 px-0 md:px-5 text-sm text-muted-foreground">
				<div className="flex flex-col md:flex-row justify-between items-center">
					<div className="flex items-center gap-2">
						<span className="text-base md:text-lg font-semibold">
							byos-nextjs
						</span>
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
