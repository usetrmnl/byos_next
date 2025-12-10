import fs from "fs";
import { Geist_Mono as FontMono, Geist as FontSans } from "next/font/google";
import localFont from "next/font/local";
import path from "path";
import { cache } from "react";

const fontPaths = {
	blockKie: path.join(process.cwd(), "public", "fonts", "BlockKie.ttf"),
	geneva9: path.join(process.cwd(), "public", "fonts", "geneva-9.ttf"),
	inter: path.join(process.cwd(), "public", "fonts", "Inter_18pt-Regular.ttf"),
};

// System fonts configuration
export const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
	preload: true,
	adjustFontFallback: true, // Automatically handles fallback fonts
});

export const fontMono = FontMono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
	preload: true,
	adjustFontFallback: true,
});

// Display fonts configuration
export const blockKie = localFont({
	src: "../public/fonts/BlockKie.ttf",
	variable: "--font-blockkie",
	preload: true,
	display: "block", // Block rendering until font is loaded for consistent display
	weight: "400",
	style: "normal",
});

// UI fonts configuration
export const geneva9 = localFont({
	src: "../public/fonts/geneva-9.ttf",
	variable: "--font-geneva9",
	preload: true,
	display: "swap", // Use fallback while loading
	weight: "400",
	style: "normal",
});

export const inter = localFont({
	src: "../public/fonts/Inter_18pt-Regular.ttf",
	variable: "--font-inter",
	preload: true,
	display: "swap",
	weight: "400",
	style: "normal",
});

// Font variables organized by purpose
export const fonts = {
	sans: fontSans,
	mono: fontMono,
	blockKie: blockKie,
	geneva9: geneva9,
	inter: inter,
} as const;

// Helper to get all font variables
export const getAllFontVariables = () =>
	Object.values(fonts)
		.map((font) => font.variable)
		.join(" ");

export const loadFont = cache(() => {
	try {
		return Object.entries(fontPaths).reduce(
			(acc, [fontName, fontPath]) => {
				acc[fontName] = Buffer.from(fs.readFileSync(fontPath));
				return acc;
			},
			{} as Record<string, Buffer>,
		);
	} catch (error) {
		console.error("Error loading fonts:", error);
		return null;
	}
});

/**
 * Returns an array of Takumi-compatible font objects
 * @param fonts Object containing font buffers from loadFont()
 * @returns Array of font configurations for Takumi
 */
export const getTakumiFonts = () => {
	const fonts = loadFont();
	if (!fonts) return [];
	const weight = 400 as const;
	const style = "normal" as const;

	const takumiFonts = Object.entries(fonts).map(([fontName, fontBuffer]) => {
		let data: ArrayBuffer;
		if (fontBuffer instanceof ArrayBuffer) {
			data = fontBuffer;
		}
		data = Uint8Array.from(fontBuffer).buffer;

		return {
			name: fontName,
			data: data,
			weight: weight,
			style: style,
		};
	});

	return takumiFonts;
};

export const extractFontFamily = (className?: string): string | undefined => {
	const defaultFont = "blockkie";
	if (!className) return defaultFont;

	const fontClass = className.split(" ").find((cls) => cls.startsWith("font-"));
	return fontClass?.replace("font-", "") || defaultFont;
};
