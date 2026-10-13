/// <reference types="jest" />
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import { resolveDeviceRenderTarget } from "@/lib/trmnl/palette-colors";
import { trmnlModelSchema, trmnlPaletteSchema } from "@/lib/trmnl/types";
import { renderDeviceImage } from "./device-image";

function loadSnapshot(file: string): unknown[] {
	const raw = readFileSync(
		path.join(process.cwd(), "data/trmnl", file),
		"utf8",
	);
	return (JSON.parse(raw) as { data: unknown[] }).data;
}

function loadProfile(modelName: string, paletteId: string): DeviceProfile {
	const model = loadSnapshot("models.json").find(
		(entry) => (entry as { name?: string }).name === modelName,
	);
	const palette = loadSnapshot("palettes.json").find(
		(entry) => (entry as { id?: string }).id === paletteId,
	);
	return {
		model: trmnlModelSchema.parse(model),
		palette: trmnlPaletteSchema.parse(palette),
	};
}

/** PNG made of vertical stripes, one per color, at the model's resolution. */
async function stripesPng(
	colors: { r: number; g: number; b: number }[],
	width: number,
	height: number,
): Promise<Buffer> {
	const data = Buffer.alloc(width * height * 3);
	const stripe = Math.ceil(width / colors.length);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const { r, g, b } = colors[Math.floor(x / stripe)];
			data.set([r, g, b], (y * width + x) * 3);
		}
	}
	return sharp(data, { raw: { width, height, channels: 3 } })
		.png()
		.toBuffer();
}

async function distinctColors(png: Buffer): Promise<string[]> {
	const { data } = await sharp(png)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const colors = new Set<string>();
	for (let i = 0; i < data.length; i += 3) {
		colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
	}
	return [...colors].sort();
}

describe("renderDeviceImage", () => {
	// seeed_e1002 is a 4-bit PNG device; the palette is what varies here.
	it.each([
		"color-3bwr",
		"color-4bwry",
		"color-6a",
		"color-7a",
	])("keeps every %s color distinct in PNG output", async (paletteId) => {
		const profile = loadProfile("seeed_e1002", paletteId);
		const target = resolveDeviceRenderTarget(profile.palette).targetPalette;
		if (!target) throw new Error(`${paletteId} has no target palette`);

		const { width, height } = profile.model;
		const result = await renderDeviceImage({
			png: await stripesPng(target, width, height),
			profile,
		});

		const expected = target.map(({ r, g, b }) => `${r},${g},${b}`).sort();
		expect(result.mime_type).toBe("image/png");
		expect(await distinctColors(result.buffer)).toEqual(expected);
	});
});
