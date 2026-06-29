import sharp from "sharp";
import {
	clampByte,
	floydSteinbergQuantize,
	quantizeValue,
} from "@/lib/render/quantize";
import type { RGB } from "@/lib/trmnl/palette-colors";

type Lab = {
	l: number;
	a: number;
	b: number;
};

type LabPaletteColor = RGB & { lab: Lab };

export type PaletteReductionMode = "snap" | "floyd-steinberg";

function pivotRgb(value: number): number {
	const normalized = value / 255;
	return normalized <= 0.04045
		? normalized / 12.92
		: ((normalized + 0.055) / 1.055) ** 2.4;
}

function pivotXyz(value: number): number {
	return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function rgbToLab(color: RGB): Lab {
	const r = pivotRgb(color.r);
	const g = pivotRgb(color.g);
	const b = pivotRgb(color.b);

	const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
	const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1;
	const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

	const fx = pivotXyz(x);
	const fy = pivotXyz(y);
	const fz = pivotXyz(z);

	return {
		l: 116 * fy - 16,
		a: 500 * (fx - fy),
		b: 200 * (fy - fz),
	};
}

function labDistanceSquared(a: Lab, b: Lab): number {
	return (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;
}

function createLabPalette(palette: RGB[]): LabPaletteColor[] {
	if (!palette.length) {
		throw new Error("Cannot reduce image to an empty palette");
	}
	return palette.map((color) => ({ ...color, lab: rgbToLab(color) }));
}

export function nearestPaletteColor(
	color: RGB,
	palette: LabPaletteColor[],
): RGB {
	const lab = rgbToLab(color);
	let best = palette[0];
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of palette) {
		const distance = labDistanceSquared(lab, candidate.lab);
		if (distance < bestDistance) {
			best = candidate;
			bestDistance = distance;
		}
	}

	return best;
}

export function snapRgbToPalette(
	data: Uint8Array | Buffer,
	paletteColors: RGB[],
): Uint8Array {
	const palette = createLabPalette(paletteColors);
	const output = new Uint8Array(data.length);

	for (let index = 0; index < data.length; index += 3) {
		const nextColor = nearestPaletteColor(
			{
				r: clampByte(data[index] ?? 0),
				g: clampByte(data[index + 1] ?? 0),
				b: clampByte(data[index + 2] ?? 0),
			},
			palette,
		);
		output[index] = nextColor.r;
		output[index + 1] = nextColor.g;
		output[index + 2] = nextColor.b;
	}

	return output;
}

function floydSteinbergRgbToPalette(
	data: Uint8Array | Buffer,
	width: number,
	height: number,
	paletteColors: RGB[],
): Uint8Array {
	const palette = createLabPalette(paletteColors);
	return floydSteinbergQuantize(data, width, height, 3, ([r, g, b]) => {
		const nextColor = nearestPaletteColor(
			{
				r: clampByte(r ?? 0),
				g: clampByte(g ?? 0),
				b: clampByte(b ?? 0),
			},
			palette,
		);
		return [nextColor.r, nextColor.g, nextColor.b];
	});
}

export async function reducePngToPalette(
	png: Buffer,
	paletteColors: RGB[],
	mode: PaletteReductionMode,
): Promise<Buffer> {
	const source = await sharp(png)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const { width, height } = source.info;
	const output =
		mode === "floyd-steinberg"
			? floydSteinbergRgbToPalette(source.data, width, height, paletteColors)
			: snapRgbToPalette(source.data, paletteColors);

	return sharp(output, { raw: { width, height, channels: 3 } })
		.png()
		.toBuffer();
}

export async function quantizePngChannels(
	png: Buffer,
	channelBitDepth: number,
): Promise<Buffer> {
	if (channelBitDepth >= 8) {
		return png;
	}

	const source = await sharp(png)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const { width, height, channels } = source.info;
	const levels = 1 << channelBitDepth;
	const output = Buffer.alloc(source.data.length);

	for (let i = 0; i < source.data.length; i++) {
		const value = source.data[i] ?? 0;
		output[i] = quantizeValue(value, levels);
	}

	return sharp(output, { raw: { width, height, channels } }).png().toBuffer();
}
