import { grayPaletteValue } from "@/lib/render/quantize";
import type { TrmnlPalette } from "./types";

export type RGB = {
	r: number;
	g: number;
	b: number;
};

export type DeviceRenderTarget = {
	targetPalette?: RGB[];
	channelBitDepth?: number;
};

export const VALID_GRAY_LEVELS = [2, 4, 16, 256] as const;
export type PaletteGrayLevel = (typeof VALID_GRAY_LEVELS)[number];

const SPECTRA_6_FIRMWARE_COLORS = new Map<string, RGB>([
	["000000", { r: 0x00, g: 0x00, b: 0x00 }],
	["FFFFFF", { r: 0xc0, g: 0xc0, b: 0xc0 }],
	["FFFF00", { r: 0xc0, g: 0xc0, b: 0x00 }],
	["FF0000", { r: 0xc0, g: 0x00, b: 0x00 }],
	["0000FF", { r: 0x00, g: 0x00, b: 0xc0 }],
	["00FF00", { r: 0x00, g: 0xc0, b: 0x00 }],
]);

function normalizeHex(hex: string): string {
	const trimmed = hex.trim().replace(/^#/, "");

	if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
		return trimmed
			.split("")
			.map((char) => `${char}${char}`)
			.join("")
			.toUpperCase();
	}

	if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
		return trimmed.toUpperCase();
	}

	throw new Error(`Invalid palette color: ${hex}`);
}

function parseHexColor(hex: string): RGB {
	const normalized = normalizeHex(hex);
	const value = Number.parseInt(normalized, 16);

	return {
		r: (value >> 16) & 0xff,
		g: (value >> 8) & 0xff,
		b: value & 0xff,
	};
}

function resolveDiscreteColors(palette: TrmnlPalette): RGB[] {
	return (palette.colors ?? []).map((hex) => {
		const normalized = normalizeHex(hex);
		if (palette.id === "color-6a") {
			return SPECTRA_6_FIRMWARE_COLORS.get(normalized) ?? parseHexColor(hex);
		}
		return parseHexColor(hex);
	});
}

function resolveGrayscaleColors(grays: number): RGB[] {
	return Array.from({ length: grays }, (_, index) => {
		const value = grayPaletteValue(index, grays);
		return { r: value, g: value, b: value };
	});
}

function isPaletteGrayLevel(value: number): value is PaletteGrayLevel {
	return VALID_GRAY_LEVELS.includes(value as PaletteGrayLevel);
}

export function getPaletteGrayLevels(
	palette: Pick<TrmnlPalette, "grays"> | null | undefined,
): PaletteGrayLevel {
	const grays = palette?.grays;
	if (typeof grays === "number" && isPaletteGrayLevel(grays)) return grays;
	return 2;
}

export function getPaletteChannelBitDepth(
	palette:
		| Pick<TrmnlPalette, "channel_bit_depth" | "grayscale_bit_depth">
		| null
		| undefined,
): number | null {
	if (typeof palette?.channel_bit_depth === "number") {
		return palette.channel_bit_depth;
	}
	if (typeof palette?.grayscale_bit_depth === "number") {
		return palette.grayscale_bit_depth;
	}
	return null;
}

export function paletteSupportsColor(
	palette:
		| Pick<TrmnlPalette, "colors" | "channel_bit_depth">
		| null
		| undefined,
): boolean {
	return Boolean(
		palette?.colors?.length ||
			(typeof palette?.channel_bit_depth === "number" &&
				palette.channel_bit_depth > 0),
	);
}

export function resolveDeviceRenderTarget(
	palette: TrmnlPalette | null | undefined,
): DeviceRenderTarget {
	if (typeof palette?.channel_bit_depth === "number") {
		return { channelBitDepth: palette.channel_bit_depth };
	}

	if (palette?.colors?.length) {
		return { targetPalette: resolveDiscreteColors(palette) };
	}

	if (typeof palette?.grays === "number" && palette.grays > 1) {
		return { targetPalette: resolveGrayscaleColors(palette.grays) };
	}

	return { targetPalette: resolveGrayscaleColors(2) };
}

export function deviceRenderTargetNeedsReduction(
	target: DeviceRenderTarget,
): boolean {
	return Boolean(
		target.targetPalette ||
			(typeof target.channelBitDepth === "number" &&
				target.channelBitDepth < 8),
	);
}
