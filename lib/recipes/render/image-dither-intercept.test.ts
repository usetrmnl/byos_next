/// <reference types="jest" />

import React from "react";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";

const prepareImageForDevice = jest.fn();
jest.mock("@/lib/render/device-image-prep", () => ({
	prepareImageForDevice: (...args: unknown[]) => prepareImageForDevice(...args),
}));

import {
	rewritePageImagesForDevice,
	rewriteReactImagesForDevice,
} from "./image-dither-intercept";
import {
	IMAGE_DITHER_OFF,
	type ImageDitherPolicy,
} from "./image-dither-policy";

type PreparedImgProps = {
	src?: string;
	style?: React.CSSProperties;
};

const FAKE_PROFILE = {} as DeviceProfile;

function makePolicy(pixelRatio: number): ImageDitherPolicy {
	return {
		mode: "on",
		profile: FAKE_PROFILE,
		method: "bayer",
		pixelRatio,
	};
}

function imgProps(element: React.ReactElement): PreparedImgProps {
	return element.props as PreparedImgProps;
}

describe("rewriteReactImagesForDevice", () => {
	beforeEach(() => {
		prepareImageForDevice.mockReset();
		prepareImageForDevice.mockResolvedValue({
			buffer: Buffer.from([]),
			dataUrl: "data:image/png;base64,prepared",
		});
	});

	it("scales logical img dimensions to physical pixels before dithering", async () => {
		const policy = makePolicy(1.8);
		const element = React.createElement("img", {
			src: "https://example.com/photo.jpg",
			width: 100,
			height: 50,
		});

		await rewriteReactImagesForDevice(element, policy);

		expect(prepareImageForDevice).toHaveBeenCalledWith(
			expect.objectContaining({ width: 180, height: 90 }),
		);
	});

	it("marks dithered images image-rendering: pixelated", async () => {
		const policy = makePolicy(2);
		const element = React.createElement("img", {
			src: "https://example.com/photo.jpg",
			width: 100,
			height: 50,
		});

		const result = await rewriteReactImagesForDevice(element, policy);

		expect(imgProps(result).src).toBe("data:image/png;base64,prepared");
		expect(imgProps(result).style).toMatchObject({
			imageRendering: "pixelated",
		});
	});

	it("leaves already-embedded data: URLs untouched and unmarked", async () => {
		const policy = makePolicy(2);
		const element = React.createElement("img", {
			src: "data:image/png;base64,already-embedded",
			width: 100,
			height: 50,
		});

		const result = await rewriteReactImagesForDevice(element, policy);

		expect(prepareImageForDevice).not.toHaveBeenCalled();
		expect(imgProps(result).src).toBe("data:image/png;base64,already-embedded");
		expect(imgProps(result).style?.imageRendering).toBeUndefined();
	});

	it("does nothing when the policy is off", async () => {
		const element = React.createElement("img", {
			src: "https://example.com/photo.jpg",
			width: 100,
			height: 50,
		});

		const result = await rewriteReactImagesForDevice(element, IMAGE_DITHER_OFF);

		expect(prepareImageForDevice).not.toHaveBeenCalled();
		expect(result).toBe(element);
	});
});

describe("rewritePageImagesForDevice", () => {
	beforeEach(() => {
		prepareImageForDevice.mockReset();
		prepareImageForDevice.mockResolvedValue({
			buffer: Buffer.from([]),
			dataUrl: "data:image/png;base64,prepared",
		});
	});

	it("does not query the page or prepare images when the policy is off", async () => {
		const evaluate = jest.fn();
		const page = { evaluate } as unknown as Parameters<
			typeof rewritePageImagesForDevice
		>[0];

		await rewritePageImagesForDevice(page, IMAGE_DITHER_OFF);

		expect(evaluate).not.toHaveBeenCalled();
		expect(prepareImageForDevice).not.toHaveBeenCalled();
	});
});
