import { Geist_Mono as FontMono, Geist as FontSans } from "next/font/google";
import localFont from "next/font/local";

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
    system: {
        sans: fontSans.variable,
        mono: fontMono.variable,
    },
    display: {
        blockKie: blockKie.variable,
    },
    ui: {
        geneva9: geneva9.variable,
        inter: inter.variable,
    },
} as const;

// Helper to get all font variables
export const getAllFontVariables = () => [
    fonts.system.sans,
    fonts.system.mono,
    fonts.display.blockKie,
    fonts.ui.geneva9,
    fonts.ui.inter,
].join(" "); 