import { deriveTypographyMetrics } from "./metrics-derive";
import type { Glyph, NewBitmapFontMetrics } from "./schema/v2";

const fallback: NewBitmapFontMetrics = {
	minY: -8,
	descenderY: -3,
	baselineY: 0,
	xHeightY: 5,
	capHeightY: 10,
	maxY: 10,
	lineGap: 5,
	pixelUnitX: 1,
	pixelUnitY: 1,
	dynamicWidth: false,
};

const glyph = (char: string, maxY: number, minY: number): Glyph => ({
	charCode: char.charCodeAt(0),
	char,
	width: 7,
	advance: 7,
	leftBearing: 0,
	bounds: { minX: 0, maxX: 6, minY, maxY },
	rows: [
		{ y: maxY, runs: [[1, 2]] },
		{ y: minY, runs: [[1, 2]] },
	],
});

describe("deriveTypographyMetrics", () => {
	it("tightens maxY to cap ink and minY to descender ink", () => {
		const metrics = deriveTypographyMetrics(
			{
				A: glyph("A", 2, -1),
				g: glyph("g", 0, -6),
				H: glyph("H", 2, -1),
			},
			fallback,
		);

		expect(metrics.maxY).toBe(3);
		expect(metrics.capHeightY).toBe(3);
		expect(metrics.minY).toBe(-6);
		expect(metrics.descenderY).toBe(-6);
		expect(metrics.xHeightY).toBeGreaterThan(0);
	});
});
