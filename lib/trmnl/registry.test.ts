/// <reference types="jest" />
import { readFileSync } from "node:fs";
import path from "node:path";
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
