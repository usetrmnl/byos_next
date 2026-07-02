/// <reference types="jest" />

import { toPhysicalImageDimensions } from "./image-display-dimensions";

describe("toPhysicalImageDimensions", () => {
	it("scales logical dimensions up by the pixel ratio", () => {
		expect(toPhysicalImageDimensions(1040, 780, 1.8)).toEqual({
			width: 1872,
			height: 1404,
		});
	});

	it("rounds to the nearest whole pixel", () => {
		expect(toPhysicalImageDimensions(100, 50, 1.8)).toEqual({
			width: 180,
			height: 90,
		});
	});

	it("is a no-op at pixelRatio 1", () => {
		expect(toPhysicalImageDimensions(800, 480, 1)).toEqual({
			width: 800,
			height: 480,
		});
	});

	it("passes through undefined dimensions unchanged", () => {
		expect(toPhysicalImageDimensions(undefined, 480, 2)).toEqual({
			width: undefined,
			height: 960,
		});
		expect(toPhysicalImageDimensions(undefined, undefined, 2)).toEqual({
			width: undefined,
			height: undefined,
		});
	});

	it("treats non-positive or invalid dimensions as absent", () => {
		expect(toPhysicalImageDimensions(0, -10, 2)).toEqual({
			width: undefined,
			height: undefined,
		});
	});

	it("falls back to a ratio of 1 for invalid pixelRatio input", () => {
		expect(toPhysicalImageDimensions(100, 50, 0)).toEqual({
			width: 100,
			height: 50,
		});
		expect(toPhysicalImageDimensions(100, 50, Number.NaN)).toEqual({
			width: 100,
			height: 50,
		});
	});

	it("never returns a dimension smaller than 1px", () => {
		expect(toPhysicalImageDimensions(1, 1, 0.01)).toEqual({
			width: 1,
			height: 1,
		});
	});
});
