import type { RGB } from "@/lib/trmnl/palette-colors";

function pivotRgb(value: number): number {
	const normalized = value / 255;
	return normalized <= 0.04045
		? normalized / 12.92
		: ((normalized + 0.055) / 1.055) ** 2.4;
}

function pivotXyz(value: number): number {
	return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

/** CIE Lab L* (perceptual lightness) from sRGB, 0–100. */
export function rgbToLStar(color: RGB): number {
	const r = pivotRgb(color.r);
	const g = pivotRgb(color.g);
	const b = pivotRgb(color.b);
	const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
	return 116 * pivotXyz(y) - 16;
}

/** Convert interleaved RGB buffer to L* grayscale bytes (0–255). */
export function rgbBufferToLStarGray(
	data: Uint8Array | Buffer,
): Uint8Array {
	const output = new Uint8Array(data.length / 3);
	for (let index = 0; index < data.length; index += 3) {
		const lStar = rgbToLStar({
			r: data[index] ?? 0,
			g: data[index + 1] ?? 0,
			b: data[index + 2] ?? 0,
		});
		output[index / 3] = Math.round(Math.min(100, Math.max(0, lStar)) * 2.55);
	}
	return output;
}
