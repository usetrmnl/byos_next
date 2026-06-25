/// <reference types="jest" />
import sharp from "sharp";
import {
	ditherImageToDataUrl,
	ditherImageToDataUrlUncached,
} from "./dither-image";
import { DitheringMethod } from "@/utils/image-processing";

async function makeSolidGrayPng(
	width: number,
	height: number,
	gray: number,
): Promise<Buffer> {
	const data = Buffer.alloc(width * height);
	data.fill(gray);
	return sharp(data, { raw: { width, height, channels: 1 } })
		.png()
		.toBuffer();
}

describe("ditherImageToDataUrl", () => {
	it("returns a PNG data URL", async () => {
		const source = await makeSolidGrayPng(32, 32, 128);
		const result = await ditherImageToDataUrl(source, {
			width: 16,
			height: 16,
			levels: 2,
			salt: 11,
		});

		expect(result.startsWith("data:image/png;base64,")).toBe(true);
	});

	it("is deterministic for identical buffer inputs", async () => {
		const source = await makeSolidGrayPng(24, 24, 140);
		const options = { width: 12, height: 12, levels: 2, salt: 21 };
		const first = await ditherImageToDataUrl(source, options);
		const second = await ditherImageToDataUrl(source, options);

		expect(second).toBe(first);
	});

	it("produces different output for different level counts", async () => {
		const source = await makeSolidGrayPng(24, 24, 140);
		const twoLevel = await ditherImageToDataUrl(source, {
			width: 12,
			height: 12,
			levels: 2,
			salt: 31,
		});
		const fourLevel = await ditherImageToDataUrl(source, {
			width: 12,
			height: 12,
			levels: 4,
			salt: 31,
		});

		expect(fourLevel).not.toBe(twoLevel);
	});

	it("dithers mid-gray flat images to multiple tones", async () => {
		const source = await makeSolidGrayPng(32, 32, 128);
		const result = await ditherImageToDataUrl(source, {
			width: 32,
			height: 32,
			levels: 2,
			salt: 41,
		});
		const commaIndex = result.indexOf(",");
		const png = Buffer.from(result.slice(commaIndex + 1), "base64");
		const { data } = await sharp(png)
			.raw()
			.toBuffer({ resolveWithObject: true });
		const unique = new Set(data);

		expect(unique.size).toBeGreaterThan(1);
	});

	it("preserves near-white images with minimal dithering", async () => {
		const source = await makeSolidGrayPng(32, 32, 250);
		const result = await ditherImageToDataUrl(source, {
			width: 32,
			height: 32,
			levels: 2,
			salt: 51,
		});
		const commaIndex = result.indexOf(",");
		const png = Buffer.from(result.slice(commaIndex + 1), "base64");
		const { data } = await sharp(png)
			.raw()
			.toBuffer({ resolveWithObject: true });

		expect(data.every((value) => value === 255)).toBe(true);
	});

	it("falls back to the original source string on fetch failure", async () => {
		const source = "https://invalid.example.test/no-image.png";
		const result = await ditherImageToDataUrlUncached(source, {
			width: 16,
			height: 16,
			levels: 2,
		});

		expect(result).toBe(source);
	});

	it("supports Bayer ordered dithering with configurable matrix size", async () => {
		const source = await makeSolidGrayPng(32, 32, 128);
		const bayer8 = await ditherImageToDataUrlUncached(source, {
			width: 32,
			height: 32,
			levels: 2,
			method: DitheringMethod.BAYER,
			bayerPatternSize: 8,
		});
		const bayer4 = await ditherImageToDataUrlUncached(source, {
			width: 32,
			height: 32,
			levels: 2,
			method: DitheringMethod.BAYER,
			bayerPatternSize: 4,
		});

		expect(bayer8.startsWith("data:image/png;base64,")).toBe(true);
		expect(bayer4).not.toBe(bayer8);
	});
});
