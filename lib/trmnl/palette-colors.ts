import type { TrmnlPalette } from "./types";

export type RGB = {
	r: number;
	g: number;
	b: number;
};

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
		const value = Math.round((index * 255) / (grays - 1));
		return { r: value, g: value, b: value };
	});
}

/**
 * Resolve the palette to a discrete color list when one applies, or `null`
 * when the palette is continuous (color-12bit / color-24bit) — those are
 * encoded by `channel_bit_depth` and handled by the renderer's per-channel
 * quantization path, NOT by nearest-neighbor LAB matching against a finite
 * list. The previous shape (`grays: 2`) collapsed continuous palettes to
 * black and white because the resolver had no way to tell continuous from
 * 1-bit grayscale.
 */
export function resolvePaletteColors(palette: TrmnlPalette): RGB[] | null {
	if (palette.colors?.length) {
		return resolveDiscreteColors(palette);
	}

	const channelBitDepth = palette.channel_bit_depth;
	if (typeof channelBitDepth === "number" && channelBitDepth >= 4) {
		// Continuous color (4-bit-per-channel or higher) — caller should not
		// quantize against a discrete list, only optionally per-channel-round.
		return null;
	}

	if (typeof palette.grays === "number" && palette.grays > 1) {
		return resolveGrayscaleColors(palette.grays);
	}

	return null;
}
