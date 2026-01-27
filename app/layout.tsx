import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAllFontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const META_THEME_COLORS = {
	light: "#ffffff",
	dark: "#09090b",
};

export const metadata: Metadata = {
	title: "TRMNL BYOS",
	description: "Device management dashboard",
	icons: {
		icon: "/trmnl-icons/trmnl-icon--black.svg",
		apple: "/trmnl-icons/trmnl-icon--black.svg",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: META_THEME_COLORS.light },
		{ media: "(prefers-color-scheme: dark)", color: META_THEME_COLORS.dark },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"bg-background overscroll-none font-sans antialiased",
					getAllFontVariables(),
				)}
			>
				<ThemeProvider>
					{children}
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
