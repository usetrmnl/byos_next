import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAllFontVariables } from "@/lib/fonts";
import { cn, getAppBaseUrl } from "@/lib/utils";

const META_THEME_COLORS = {
	light: "#ffffff",
	dark: "#09090b",
};

const APP_NAME = "TRMNL BYOS";
const APP_DESCRIPTION =
	"Self-hosted server and device management dashboard for TRMNL e-ink displays.";

export const metadata: Metadata = {
	metadataBase: getAppBaseUrl(),
	title: {
		default: APP_NAME,
		template: `%s · ${APP_NAME}`,
	},
	description: APP_DESCRIPTION,
	applicationName: APP_NAME,
	authors: [{ name: "usetrmnl", url: "https://github.com/usetrmnl/byos_next" }],
	creator: "TRMNL",
	publisher: "TRMNL",
	category: "technology",
	keywords: [
		"TRMNL",
		"BYOS",
		"e-ink",
		"eink",
		"dashboard",
		"self-hosted",
		"device management",
		"ESP32",
	],
	icons: {
		icon: [
			{ url: "/trmnl-icons/trmnl-icon--brand.svg", type: "image/svg+xml" },
		],
		shortcut: "/trmnl-icons/trmnl-icon--brand.svg",
		apple: "/trmnl-icons/trmnl-icon--brand.svg",
	},
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		title: APP_NAME,
		statusBarStyle: "black-translucent",
	},
	formatDetection: { telephone: false },
	openGraph: {
		type: "website",
		siteName: APP_NAME,
		title: APP_NAME,
		description: APP_DESCRIPTION,
		url: "/",
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: APP_NAME,
		description: APP_DESCRIPTION,
	},
	// Private admin dashboard — keep it out of search indexes.
	robots: { index: false, follow: false },
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
					<TooltipProvider>
						{children}
						<Toaster />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
