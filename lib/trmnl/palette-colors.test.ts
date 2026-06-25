/// <reference types="jest" />
import { getPaletteGrayLevels } from "./palette-colors";
import type { TrmnlPalette } from "./types";

describe("getPaletteGrayLevels", () => {
	it("returns gray counts for grayscale palettes", () => {
		expect(getPaletteGrayLevels({ id: "bw", name: "BW", grays: 2 })).toBe(2);
		expect(
			getPaletteGrayLevels({ id: "gray-4", name: "Gray 4", grays: 4 }),
		).toBe(4);
	});

	it("returns null for color palettes", () => {
		const palette: TrmnlPalette = {
			id: "color-6a",
			name: "Color 6",
			grays: 2,
			colors: ["#000000", "#FFFFFF"],
		};
		expect(getPaletteGrayLevels(palette)).toBeNull();
	});

	it("defaults to 2 when palette is absent", () => {
		expect(getPaletteGrayLevels(null)).toBe(2);
	});
});
