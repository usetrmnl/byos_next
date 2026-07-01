/// <reference types="jest" />

import { createScreenProfile } from "@/lib/trmnl/screen-profile";
import type { TrmnlPalette } from "@/lib/trmnl/types";
import { buildRecipeDeviceContext } from "./device-context";

describe("buildRecipeDeviceContext", () => {
	it("sets levels for grayscale palettes and null colorPalette", () => {
		const palette: TrmnlPalette = {
			id: "gray-16",
			name: "16 Grays",
			grays: 16,
		};
		const screen = createScreenProfile({
			width: 800,
			height: 480,
			palette,
		});
		const ctx = buildRecipeDeviceContext({ palette, screen, salt: 7 });

		expect(ctx.levels).toBe(16);
		expect(ctx.colorPalette).toBeNull();
	});

	it("sets colorPalette and null levels for discrete color palettes", () => {
		const palette: TrmnlPalette = {
			id: "color-6a",
			name: "Color 6",
			grays: 2,
			colors: [
				"#FF0000",
				"#00FF00",
				"#0000FF",
				"#FFFF00",
				"#000000",
				"#FFFFFF",
			],
		};
		const screen = createScreenProfile({
			width: 800,
			height: 480,
			palette,
		});
		const ctx = buildRecipeDeviceContext({ palette, screen, salt: 3 });

		expect(ctx.levels).toBeNull();
		expect(ctx.colorPalette?.length).toBe(6);
	});
});
