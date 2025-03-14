import type { Metadata, Viewport } from "next";
import { Geist_Mono as FontMono, Geist as FontSans } from "next/font/google";
import localFont from 'next/font/local'
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Suspense, cache } from "react";
import MainLayout from "@/components/main-layout";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
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
	src: '../public/fonts/BlockKie.ttf', // Adjust path as needed
	variable: '--font-blockkie',
	weight: '400',
	style: 'normal',
  });

const geneva9 = localFont({
	src: '../public/fonts/geneva-9.ttf',
	variable: '--font-geneva9',
	weight: '400',
	style: 'normal',
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

async function getDevicesPromise() {
	const { supabase, dbStatus } = await createClient();

	// Fetch devices only if DB ready
	if (dbStatus.ready && supabase) {
		const devicesPromise = cache(async () => {
			const { data, error } = await supabase.from("devices").select("*");
			if (error) throw error; // Rejects the promise if there's an error
			return data; // Resolves only with the data
		})(); // Call the cached function immediately
		return devicesPromise;
	}

	console.warn("Missing Supabase environment variables, entering no db mode");
	// return a promise that resolves to an empty array
	return Promise.resolve([]);
}

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

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const devicesPromise = getDevicesPromise();

	return (
		<html lang="en" suppressHydrationWarning>
			{/* <head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `,
					}}
				/>
			</head> */}
			<body
				className={cn(
					"bg-background overscroll-none font-sans antialiased",
					fontSans.variable,
					fontMono.variable,
					blockKie.variable,
					geneva9.variable,
				)}
			>
				<Suspense
					fallback={
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
					}
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<MainLayout devicesPromise={devicesPromise}>
							<Suspense fallback={<MainContentFallback />}>{children}</Suspense>
						</MainLayout>
						<Toaster />
					</ThemeProvider>
				</Suspense>
			</body>
		</html>
	);
}
