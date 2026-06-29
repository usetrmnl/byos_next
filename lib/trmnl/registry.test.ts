/// <reference types="jest" />
import { readFileSync } from "node:fs";
import path from "node:path";
import {
	getPaletteChannelBitDepth,
	getPaletteGrayLevels,
	paletteSupportsColor,
	resolveDeviceRenderTarget,
} from "./palette-colors";
import { parseRegistryList } from "./registry";
import { trmnlModelSchema, trmnlPaletteSchema } from "./types";

function loadSnapshot(file: string): unknown[] {
	const raw = readFileSync(
		path.join(process.cwd(), "data/trmnl", file),
		"utf8",
	);
	const parsed = JSON.parse(raw) as { data?: unknown };
	if (!Array.isArray(parsed.data)) {
		throw new Error(`${file} does not contain a data array`);
	}
	return parsed.data;
}

describe("TRMNL registry contracts", () => {
	it("accepts every bundled model snapshot entry", () => {
		const invalid = loadSnapshot("models.json")
			.map((model) => ({ model, result: trmnlModelSchema.safeParse(model) }))
			.filter(({ result }) => !result.success)
			.map(({ model, result }) => ({
				name: (model as { name?: string }).name,
				issues: result.success ? [] : result.error.issues,
			}));

		expect(invalid).toEqual([]);
	});

	it("accepts every bundled palette snapshot entry", () => {
		const invalid = loadSnapshot("palettes.json")
			.map((palette) => ({
				palette,
				result: trmnlPaletteSchema.safeParse(palette),
			}))
			.filter(({ result }) => !result.success)
			.map(({ palette, result }) => ({
				id: (palette as { id?: string }).id,
				issues: result.success ? [] : result.error.issues,
			}));

		expect(invalid).toEqual([]);
	});

	it("normalizes continuous color palettes away from grayscale fallback data", () => {
		const palettes = parseRegistryList("palettes", trmnlPaletteSchema, {
			data: loadSnapshot("palettes.json"),
		});

		expect(
			palettes.find((palette) => palette.id === "color-12bit"),
		).toMatchObject({
			grays: null,
			channel_bit_depth: 4,
		});
		expect(
			palettes.find((palette) => palette.id === "color-24bit"),
		).toMatchObject({
			grays: null,
			channel_bit_depth: 8,
		});
	});

	it("derives gray levels from palette grays rather than palette ids", () => {
		const palettes = parseRegistryList("palettes", trmnlPaletteSchema, {
			data: loadSnapshot("palettes.json"),
		});

		expect(getPaletteGrayLevels(palettes.find((p) => p.id === "bw"))).toBe(2);
		expect(getPaletteGrayLevels(palettes.find((p) => p.id === "gray-4"))).toBe(
			4,
		);
		expect(getPaletteGrayLevels(palettes.find((p) => p.id === "gray-16"))).toBe(
			16,
		);
		expect(
			getPaletteGrayLevels(palettes.find((p) => p.id === "gray-256")),
		).toBe(256);
		expect(
			getPaletteGrayLevels(palettes.find((p) => p.id === "color-12bit")),
		).toBe(2);
	});

	it("centralizes palette color and channel bit-depth detection", () => {
		const palettes = parseRegistryList("palettes", trmnlPaletteSchema, {
			data: loadSnapshot("palettes.json"),
		});

		const bw = palettes.find((p) => p.id === "bw");
		const color6 = palettes.find((p) => p.id === "color-6a");
		const color12 = palettes.find((p) => p.id === "color-12bit");

		expect(paletteSupportsColor(bw)).toBe(false);
		expect(paletteSupportsColor(color6)).toBe(true);
		expect(paletteSupportsColor(color12)).toBe(true);
		expect(getPaletteChannelBitDepth(color6)).toBe(1);
		expect(getPaletteChannelBitDepth(color12)).toBe(4);
	});

	it("resolves render targets without mixing palette colors and grayscale levels", () => {
		const palettes = parseRegistryList("palettes", trmnlPaletteSchema, {
			data: loadSnapshot("palettes.json"),
		});

		const bw = resolveDeviceRenderTarget(palettes.find((p) => p.id === "bw"));
		const gray16 = resolveDeviceRenderTarget(
			palettes.find((p) => p.id === "gray-16"),
		);
		const color6 = resolveDeviceRenderTarget(
			palettes.find((p) => p.id === "color-6a"),
		);
		const color12 = resolveDeviceRenderTarget(
			palettes.find((p) => p.id === "color-12bit"),
		);
		const color24 = resolveDeviceRenderTarget(
			palettes.find((p) => p.id === "color-24bit"),
		);

		expect(bw.targetPalette).toHaveLength(2);
		expect(gray16.targetPalette).toHaveLength(16);
		expect(color6.targetPalette).toHaveLength(6);
		expect(color12).toEqual({ channelBitDepth: 4 });
		expect(color24).toEqual({ channelBitDepth: 8 });
	});

	it("accepts nullable fields allowed by the upstream model/palette contract", () => {
		expect(
			trmnlModelSchema.safeParse({
				name: "api_model",
				label: "API Model",
				width: 800,
				height: 480,
				colors: 2,
				bit_depth: 1,
				scale_factor: 1,
				rotation: 0,
				mime_type: "image/png",
				offset_x: 0,
				offset_y: 0,
				palette_ids: ["bw"],
				css: null,
			}).success,
		).toBe(true);

		expect(
			trmnlPaletteSchema.safeParse({
				id: "api-palette",
				name: "API Palette",
				grays: null,
				colors: null,
				grayscale_bit_depth: null,
			}).success,
		).toBe(true);
	});

	it("drops malformed registry entries without dropping the valid ones", () => {
		const warn = jest
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);

		const parsed = parseRegistryList("palettes", trmnlPaletteSchema, {
			data: [
				{ id: "bw", name: "Black & White", grays: 2 },
				{ id: "broken", grays: 4 },
			],
		});

		expect(parsed).toEqual([{ id: "bw", name: "Black & White", grays: 2 }]);
		expect(warn).toHaveBeenCalledTimes(1);

		warn.mockRestore();
	});
});
