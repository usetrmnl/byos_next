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

describe("renderDeviceImage quantization", () => {
	it("hard-snaps the full frame to the palette (no frame-wide dither)", async () => {
		const profile = await getDeviceProfile("og_png", "bw");
		const png = await makeHorizontalGradientPng(64, 8);
		const first = await renderDeviceImage({ png, profile });
		const second = await renderDeviceImage({ png, profile });

		expect(second.buffer.equals(first.buffer)).toBe(true);
	});

	it("quantizes to the discrete palette for gray-4 devices", async () => {
		const profile = await getDeviceProfile("og_plus", "gray-4");
		const png = await makeHorizontalGradientPng(32, 4);
		const result = await renderDeviceImage({ png, profile });
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

	it("uses Lab perceptual luminance for BMP gray encoding", async () => {
		const profile = await getDeviceProfile("og_bmp", "bw");
		const png = await makeSolidPng(8, 8, { r: 0, g: 0, b: 255 });
		const result = await renderDeviceImage({ png, profile });
		const { data } = await sharp(result.buffer).raw().toBuffer({
			resolveWithObject: true,
		});

		expect(data.every((value) => value === 0)).toBe(true);
	});
});
