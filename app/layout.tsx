import type { Metadata, Viewport } from "next";
import { Geist_Mono as FontMono, Geist as FontSans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import MainLayout from "@/components/main-layout-server";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontMono = FontMono({
	subsets: ["latin"],
	variable: "--font-mono",
});

const blockKie = localFont({
	src: "../public/fonts/BlockKie.ttf", // Adjust path as needed
	variable: "--font-blockkie",
	weight: "400",
	style: "normal",
});

const geneva9 = localFont({
	src: "../public/fonts/geneva-9.ttf",
	variable: "--font-geneva9",
	weight: "400",
	style: "normal",
});

const inter = localFont({
	src: "../public/fonts/Inter_18pt-Regular.ttf",
	variable: "--font-inter",
	weight: "400",
	style: "normal",
});

const META_THEME_COLORS = {
	light: "#ffffff",
	dark: "#09090b",
};

export const metadata: Metadata = {
	title: "trmnl-byos-nextjs",
	description: "Device management dashboard",
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: META_THEME_COLORS.light },
		{ media: "(prefers-color-scheme: dark)", color: META_THEME_COLORS.dark },
	],
};

// Server Component MainContentFallback for loading states
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

// Layout skeleton to use while the main layout is loading
const LayoutSkeleton = () => (
	<div className="min-h-screen flex flex-col">
		<div className="border-b bg-background">
			<div className="flex h-14 items-center px-4">
				<Skeleton className="h-5 w-5 mr-2 rounded-md md:hidden" />
				<div className="flex items-center gap-2">
					<Skeleton className="h-7 w-48 rounded-md" />
				</div>
				<div className="ml-auto flex items-center space-x-2">
					<Skeleton className="h-9 w-9 rounded-md" />
					<Skeleton className="h-9 w-9 rounded-md" />
				</div>
			</div>
		</div>
		<div className="flex flex-1">
			<div className="w-56 border-r bg-background hidden md:block">
				<div className="p-2 space-y-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-9 w-full rounded-md" />
					))}
				</div>
			</div>
			<div className="flex-1 p-6 space-y-6">
				<Skeleton className="h-8 w-64 rounded-md" />
				<Skeleton className="h-32 w-full rounded-md" />
				<Skeleton className="h-32 w-full rounded-md" />
			</div>
		</div>
	</div>
);

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"bg-background overscroll-none font-sans antialiased",
					fontSans.variable,
					fontMono.variable,
					blockKie.variable,
					geneva9.variable,
					inter.variable,
				)}
			>
				{/* ThemeProvider is a Client Component wrapper */}
				<ThemeProvider>
					<Suspense fallback={<LayoutSkeleton />}>
						<MainLayout>
							<Suspense fallback={<MainContentFallback />}>{children}</Suspense>
						</MainLayout>
						<Toaster />
					</Suspense>
				</ThemeProvider>
			</body>
		</html>
	);
}
