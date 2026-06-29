export function clampByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

export function quantizeValue(value: number, levels: number): number {
	const step = 255 / (levels - 1);
	const level = Math.round(value / step);
	return clampByte(level * step);
}

export function grayPaletteIndex(value: number, levels: number): number {
	const step = 255 / (levels - 1);
	return Math.max(0, Math.min(levels - 1, Math.round(value / step)));
}

export function grayPaletteValue(index: number, levels: number): number {
	const step = 255 / (levels - 1);
	return clampByte(index * step);
}

type QuantizeNearest = (values: readonly number[]) => readonly number[];

function distributeError(
	pixels: Float64Array,
	width: number,
	height: number,
	channels: number,
	x: number,
	y: number,
	error: readonly number[],
	factor: number,
): void {
	if (x < 0 || x >= width || y < 0 || y >= height) return;

	const index = (y * width + x) * channels;
	for (let channel = 0; channel < channels; channel++) {
		pixels[index + channel] += (error[channel] ?? 0) * factor;
	}
}

export function floydSteinbergQuantize(
	data: Uint8Array | Buffer,
	width: number,
	height: number,
	channels: number,
	nearest: QuantizeNearest,
): Uint8Array {
	const pixels = new Float64Array(data.length);
	for (let index = 0; index < data.length; index++) {
		pixels[index] = data[index] ?? 0;
	}

	const output = new Uint8Array(data.length);
	const oldValues = new Array<number>(channels);
	const error = new Array<number>(channels);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * channels;
			for (let channel = 0; channel < channels; channel++) {
				oldValues[channel] = clampByte(pixels[index + channel] ?? 0);
			}

			const nextValues = nearest(oldValues);
			for (let channel = 0; channel < channels; channel++) {
				const nextValue = clampByte(nextValues[channel] ?? 0);
				output[index + channel] = nextValue;
				error[channel] = (oldValues[channel] ?? 0) - nextValue;
			}

			distributeError(pixels, width, height, channels, x + 1, y, error, 7 / 16);
			distributeError(
				pixels,
				width,
				height,
				channels,
				x - 1,
				y + 1,
				error,
				3 / 16,
			);
			distributeError(pixels, width, height, channels, x, y + 1, error, 5 / 16);
			distributeError(
				pixels,
				width,
				height,
				channels,
				x + 1,
				y + 1,
				error,
				1 / 16,
			);
		}
	}

	return output;
}

export function floydSteinbergGray(
	data: Uint8Array | Buffer,
	width: number,
	height: number,
	levels: number,
): Uint8Array {
	return floydSteinbergQuantize(data, width, height, 1, ([value]) => [
		quantizeValue(value ?? 0, levels),
	]);
}
