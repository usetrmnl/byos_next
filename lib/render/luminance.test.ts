/// <reference types="jest" />
import { rgbBufferToLStarGray, rgbToLStar } from "./luminance";

describe("rgbToLStar", () => {
	it("separates blue-on-yellow from yellow-on-blue perceptually", () => {
		const blueOnYellowBg = rgbToLStar({ r: 255, g: 255, b: 0 });
		const blueText = rgbToLStar({ r: 0, g: 0, b: 255 });
		const yellowOnBlueBg = rgbToLStar({ r: 0, g: 0, b: 255 });
		const yellowText = rgbToLStar({ r: 255, g: 255, b: 0 });

		expect(Math.abs(blueOnYellowBg - blueText)).toBeGreaterThan(15);
		expect(Math.abs(yellowOnBlueBg - yellowText)).toBeGreaterThan(15);
	});

	it("orders white above black", () => {
		expect(rgbToLStar({ r: 255, g: 255, b: 255 })).toBeGreaterThan(
			rgbToLStar({ r: 0, g: 0, b: 0 }),
		);
	});
});

describe("rgbBufferToLStarGray", () => {
	it("maps RGB buffer to 0-255 gray bytes", () => {
		const data = Buffer.from([255, 255, 255, 0, 0, 0]);
		const gray = rgbBufferToLStarGray(data);
		expect(gray.length).toBe(2);
		expect(gray[0]).toBeGreaterThan(gray[1]);
	});
});
