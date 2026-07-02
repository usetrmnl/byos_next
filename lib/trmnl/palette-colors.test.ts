/// <reference types="jest" />
import { getPaletteGrayLevels } from "./palette-colors";
import type { TrmnlPalette } from "./types";

describe("getPaletteGrayLevels", () => {
	it("returns gray counts for grayscale palettes", () => {
		expect(getPaletteGrayLevels({ grays: 2 })).toBe(2);
		expect(getPaletteGrayLevels({ grays: 4 })).toBe(4);
		expect(getPaletteGrayLevels({ grays: 16 })).toBe(16);
	});

	it("returns palette grays field for color palettes (not null)", () => {
		const palette: TrmnlPalette = {
			id: "color-6a",
			name: "Color 6",
			grays: 2,
			colors: ["#000000", "#FFFFFF"],
		};
		expect(getPaletteGrayLevels(palette)).toBe(2);
	});

	it("defaults to 2 when palette is absent", () => {
		expect(getPaletteGrayLevels(null)).toBe(2);
	});
});
