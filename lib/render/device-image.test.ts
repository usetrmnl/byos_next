/// <reference types="jest" />
import sharp from "sharp";
import { getDeviceProfile } from "@/lib/trmnl/device-profile";
import { renderDeviceImage } from "./device-image";

async function makeHorizontalGradientPng(
	width: number,
	height: number,
): Promise<Buffer> {
	const data = Buffer.alloc(width * height * 3);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const value = Math.round((x / Math.max(width - 1, 1)) * 255);
			const index = (y * width + x) * 3;
			data[index] = value;
			data[index + 1] = value;
			data[index + 2] = value;
		}
	}

	return sharp(data, { raw: { width, height, channels: 3 } })
		.png()
		.toBuffer();
}

async function makeSolidPng(
	width: number,
	height: number,
	color: { r: number; g: number; b: number },
): Promise<Buffer> {
	const data = Buffer.alloc(width * height * 3);
	for (let index = 0; index < data.length; index += 3) {
		data[index] = color.r;
		data[index + 1] = color.g;
		data[index + 2] = color.b;
	}

	return sharp(data, { raw: { width, height, channels: 3 } })
		.png()
		.toBuffer();
}

function countRowTransitions(raw: Buffer, width: number, row: number): number {
	let transitions = 0;
	let previous = raw[row * width * 3] ?? 0;
	for (let x = 1; x < width; x++) {
		const value = raw[(row * width + x) * 3] ?? 0;
		if (value !== previous) transitions += 1;
		previous = value;
	}
	return transitions;
}

describe("renderDeviceImage quantization", () => {
	it("defaults to pure palette quantization without error diffusion", async () => {
		const profile = await getDeviceProfile("og_png", "bw");
		const png = await makeHorizontalGradientPng(64, 8);
		const pure = await renderDeviceImage({ png, profile, dither: false });
		const defaultResult = await renderDeviceImage({ png, profile });

		expect(defaultResult.buffer.equals(pure.buffer)).toBe(true);
	});

	it("produces a different output when dither is enabled", async () => {
		const profile = await getDeviceProfile("og_png", "bw");
		const png = await makeHorizontalGradientPng(64, 8);
		const pure = await renderDeviceImage({ png, profile, dither: false });
		const dithered = await renderDeviceImage({ png, profile, dither: true });

		expect(dithered.buffer.equals(pure.buffer)).toBe(false);

		const pureRaw = await sharp(pure.buffer)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const ditherRaw = await sharp(dithered.buffer)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const centerRow = Math.floor(pureRaw.info.height / 2);

		expect(
			countRowTransitions(ditherRaw.data, pureRaw.info.width, centerRow),
		).toBeGreaterThan(
			countRowTransitions(pureRaw.data, pureRaw.info.width, centerRow),
		);
	});

	it("quantizes to the discrete palette for gray-4 devices", async () => {
		const profile = await getDeviceProfile("og_plus", "gray-4");
		const png = await makeHorizontalGradientPng(32, 4);
		const result = await renderDeviceImage({ png, profile, dither: false });
		const { data } = await sharp(result.buffer).raw().toBuffer({
			resolveWithObject: true,
		});

		const uniqueGrays = new Set<number>();
		for (let index = 0; index < data.length; index += 3) {
			const gray = data[index] ?? 0;
			if (data[index + 1] === gray && data[index + 2] === gray) {
				uniqueGrays.add(gray);
			}
		}

		expect(uniqueGrays.size).toBeLessThanOrEqual(4);
		expect(uniqueGrays.size).toBeGreaterThan(1);
	});

	it("uses luminance for pure grayscale palette quantization", async () => {
		const profile = await getDeviceProfile("og_png", "bw");
		const png = await makeSolidPng(8, 8, { r: 0, g: 0, b: 255 });
		const result = await renderDeviceImage({ png, profile, dither: false });
		const { data } = await sharp(result.buffer).raw().toBuffer({
			resolveWithObject: true,
		});

		expect(data.every((value) => value === 0)).toBe(true);
	});
});
