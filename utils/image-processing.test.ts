/// <reference types="jest" />
import {
	applyDithering,
	DEFAULT_DITHER_SALT,
	DitheringMethod,
	ditherWhiteNoise,
	quantizeValue,
} from "./image-processing";

describe("ditherWhiteNoise", () => {
	it("is deterministic for the same salt", () => {
		const width = 16;
		const height = 8;
		const grayscale = new Uint8Array(width * height).fill(128);
		const first = ditherWhiteNoise(
			grayscale,
			width,
			height,
			2,
			DEFAULT_DITHER_SALT,
			128,
		);
		const second = ditherWhiteNoise(
			grayscale,
			width,
			height,
			2,
			DEFAULT_DITHER_SALT,
			128,
		);

		expect(Array.from(second)).toEqual(Array.from(first));
	});

	it("changes output when salt changes", () => {
		const width = 16;
		const height = 8;
		const grayscale = new Uint8Array(width * height).fill(128);
		const first = ditherWhiteNoise(grayscale, width, height, 2, 1, 128);
		const second = ditherWhiteNoise(grayscale, width, height, 2, 2, 128);

		expect(Array.from(second)).not.toEqual(Array.from(first));
	});

	it("outputs only quantized level values", () => {
		const width = 8;
		const height = 8;
		const levels = 4;
		const grayscale = new Uint8Array(width * height);
		for (let index = 0; index < grayscale.length; index++) {
			grayscale[index] = index * 3;
		}

		const result = ditherWhiteNoise(grayscale, width, height, levels, 42, 128);
		const allowed = new Set(
			Array.from({ length: levels }, (_, index) =>
				quantizeValue(Math.round((index * 255) / (levels - 1)), levels),
			),
		);

		for (const value of result) {
			expect(allowed.has(value)).toBe(true);
		}
	});

	it("reduces dither amplitude near white extremes", () => {
		const width = 32;
		const height = 8;
		const midGray = new Uint8Array(width * height).fill(128);
		const nearWhite = new Uint8Array(width * height).fill(250);
		const mid = ditherWhiteNoise(midGray, width, height, 2, 7, 128);
		const white = ditherWhiteNoise(nearWhite, width, height, 2, 7, 250);

		const countUnique = (values: Uint8Array) => new Set(values).size;
		expect(countUnique(mid)).toBeGreaterThan(1);
		expect(countUnique(white)).toBe(1);
	});

	it("is wired through applyDithering", () => {
		const width = 4;
		const height = 4;
		const grayscale = new Uint8Array(width * height).fill(128);
		const result = applyDithering(DitheringMethod.WHITE_NOISE, grayscale, {
			width,
			height,
			levels: 2,
			salt: 99,
			meanLightness: 128,
		});

		expect(result.length).toBe(grayscale.length);
	});
});
