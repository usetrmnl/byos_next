import fs from "fs";
import { Geist_Mono as FontMono, Geist as FontSans } from "next/font/google";
import localFont from "next/font/local";
import { cache } from "react";
import {
	FONT_SOURCES,
	getFontDiskPath,
	getTakumiFontSources,
	TAILWIND_SLUG_TO_TAKUMI,
	type FontSource,
} from "@/lib/font-sources";

// System fonts configuration
export const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
	preload: true,
	adjustFontFallback: true,
});

export const fontMono = FontMono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
	preload: true,
	adjustFontFallback: true,
});

export const blockKie = localFont({
	src: "../public/fonts/BlockKie.ttf",
	variable: "--font-blockkie",
	preload: true,
	display: "block",
	weight: "400",
	style: "normal",
});

export const geneva9 = localFont({
	src: "../public/fonts/geneva-9.ttf",
	variable: "--font-geneva9",
	preload: true,
	display: "swap",
	weight: "400",
	style: "normal",
});

export const geneva12 = localFont({
	src: "../public/fonts/geneva-12.otf",
	variable: "--font-geneva12",
	preload: true,
	display: "swap",
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

export const geistPixelSquare = localFont({
	src: "../public/fonts/GeistPixel-Square.woff2",
	variable: "--font-geist-pixel-square",
	preload: true,
	display: "swap",
	weight: "500",
	style: "normal",
});

export const pixelifySans = localFont({
	src: "../public/fonts/PixelifySans-VariableFont_wght.ttf",
	variable: "--font-pixelify-sans",
	preload: true,
	display: "swap",
	weight: "400",
	style: "normal",
});

export const fonts = {
	sans: fontSans,
	mono: fontMono,
	blockKie,
	geneva9,
	geneva12,
	inter,
	geistPixelSquare,
	pixelifySans,
} as const;

export const getAllFontVariables = () =>
	Object.values(fonts)
		.map((font) => font.variable)
		.join(" ");

const takumiFontSources = getTakumiFontSources().filter(
	(source): source is FontSource & { takumiName: string } =>
		Boolean(source.takumiName),
);

const takumiFontPaths = Object.fromEntries(
	takumiFontSources.map((source) => [
		source.takumiName,
		getFontDiskPath(source),
	]),
);

export const loadFont = cache(() => {
	try {
		return Object.entries(takumiFontPaths).reduce(
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

export const getTakumiFonts = () => {
	const fontBuffers = loadFont();
	if (!fontBuffers) return [];

	return takumiFontSources.map((source) => {
		const fontBuffer = fontBuffers[source.takumiName];
		const data = Uint8Array.from(fontBuffer).buffer;

		return {
			name: source.takumiName,
			data,
			weight: source.weight as 400 | 500,
			style: "normal" as const,
		};
	});
};

export const extractFontFamily = (className?: string): string | undefined => {
	const defaultFont =
		TAILWIND_SLUG_TO_TAKUMI.blockkie ??
		FONT_SOURCES[0]?.takumiName ??
		"blockKie";
	if (!className) return defaultFont;

	const fontClass = className.split(" ").find((cls) => cls.startsWith("font-"));
	if (!fontClass) return defaultFont;

	const slug = fontClass.replace("font-", "");
	return TAILWIND_SLUG_TO_TAKUMI[slug] ?? slug;
};
