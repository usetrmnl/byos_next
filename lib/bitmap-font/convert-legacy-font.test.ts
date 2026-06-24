import {
	convertLegacyBitmapFont,
	convertLegacyGlyph,
	convertLegacyPackToV2,
} from "./convert-legacy-font";
import { convertV2PackToLegacy } from "./convert-v2-to-legacy";
import { layoutV2Text } from "./layout-v2";
import { resolveV2Face } from "./pack-utils";

describe("convertLegacyBitmapFont", () => {
	const samplePack = {
		metadata: {
			name: "Sample",
			version: "1.0",
			metrics: {
				cellHeight: 23,
				capTop: 2,
				baselineRow: 15,
				descenderDepth: 4,
				xHeight: 10,
				lineHeight: 10,
				pixelUnitX: 1,
				pixelUnitY: 1,
				dynamicWidth: true,
			},
		},
		fonts: [
			{
				width: 0,
				height: 23,
				characters: [
					{
						charCode: 33,
						char: "!",
						width: 6,
						advance: 6,
						data: "AAIIIIIIIIIAAAIIAAAAAAAA",
					},
				],
			},
		],
	};

	it("converts legacy metrics to baseline-relative metrics", () => {
		const converted = convertLegacyBitmapFont(samplePack);

		expect(converted.metadata.metrics).toEqual({
			minY: -7,
			descenderY: -4,
			baselineY: 0,
			xHeightY: 10,
			capHeightY: 13,
			maxY: 15,
			lineGap: 10,
			pixelUnitX: 1,
			pixelUnitY: 1,
			dynamicWidth: true,
		});
	});

	it("converts literal AA/II rows into baseline-relative runs", () => {
		const quote = convertLegacyGlyph(
			{
				charCode: 34,
				char: '"',
				width: 8,
				advance: 8,
				data: "IIAAIIAA",
			},
			{ width: 0, height: 1, characters: [] },
			{
				cellHeight: 1,
				capTop: 0,
				baselineRow: 0,
				descenderDepth: 0,
				xHeight: 1,
				lineHeight: 1,
			},
		);

		expect(quote.rows).toEqual([{ y: 0, runs: [[0, 2], [4, 6]] }]);
		expect(quote.bounds).toEqual({
			minX: 0,
			maxX: 6,
			minY: 0,
			maxY: 0,
		});
	});

	it("keys glyphs by character by default", () => {
		const converted = convertLegacyBitmapFont(samplePack);
		expect(converted.glyphs?.["!"].charCode).toBe(33);
		expect(converted.glyphs?.["!"].advance).toBe(6);
	});

	it("can key glyphs by charCode", () => {
		const converted = convertLegacyBitmapFont(samplePack, {
			useCharCodeKeys: true,
		});
		expect(converted.glyphs?.["33"].char).toBe("!");
	});
});

describe("convertLegacyPackToV2", () => {
	it("merges multiple legacy faces into faces map", () => {
		const pack = {
			metadata: {
				name: "Geneva",
				version: "1.0",
				metrics: {
					cellHeight: 8,
					capTop: 1,
					baselineRow: 6,
					descenderDepth: 1,
					xHeight: 4,
					lineHeight: 4,
				},
			},
			fonts: [
				{
					width: 7,
					height: 8,
					characters: [
						{
							charCode: 65,
							char: "A",
							data: "1111111",
							width: 7,
							advance: 7,
						},
					],
				},
				{
					width: 12,
					height: 12,
					characters: [
						{
							charCode: 65,
							char: "A",
							data: "1".repeat(12 * 12),
							width: 12,
							advance: 12,
						},
					],
				},
			],
		};

		const converted = convertLegacyPackToV2(pack);
		expect(converted.faces?.["7x8"].glyphs.A.charCode).toBe(65);
		expect(converted.faces?.["12x12"].glyphs.A.width).toBe(12);
		expect(converted.glyphs).toBeUndefined();
	});
});

describe("v2 roundtrip", () => {
	const samplePack = {
		metadata: {
			name: "Sample",
			version: "1.0",
			metrics: {
				cellHeight: 23,
				capTop: 2,
				baselineRow: 15,
				descenderDepth: 4,
				xHeight: 10,
				lineHeight: 10,
				pixelUnitX: 1,
				pixelUnitY: 1,
				dynamicWidth: true,
			},
		},
		fonts: [
			{
				width: 0,
				height: 23,
				characters: [
					{
						charCode: 34,
						char: '"',
						width: 8,
						advance: 8,
						data: "IIAAIIAA",
					},
				],
			},
		],
	};

	it("preserves glyph runs through legacy → v2 → legacy", () => {
		const v2 = convertLegacyBitmapFont(samplePack);
		const legacy = convertV2PackToLegacy(v2);
		const roundtrip = convertLegacyBitmapFont(legacy);

		expect(roundtrip.glyphs?.['"'].rows).toEqual(v2.glyphs?.['"'].rows);
	});
});

describe("layoutV2Text", () => {
	it("lays out baseline-relative glyph runs", () => {
		const pack = convertLegacyPackToV2({
			metadata: {
				metrics: {
					cellHeight: 1,
					capTop: 0,
					baselineRow: 0,
					descenderDepth: 0,
					xHeight: 1,
					lineHeight: 1,
				},
			},
			fonts: [
				{
					width: 8,
					height: 1,
					characters: [
						{
							charCode: 34,
							char: '"',
							width: 8,
							advance: 8,
							data: "IIAAIIAA",
						},
					],
				},
			],
		});

		const face = resolveV2Face(pack, "8x1");
		expect(face).not.toBeNull();

		const layout = layoutV2Text({
			text: '"',
			glyphs: face!.glyphs,
			metrics: face!.metrics,
			gridWidth: face!.gridWidth,
			scale: 1,
			gap: 0,
		});

		expect(layout.lines[0]?.paths[0]?.path).toContain("M 0 0");
		expect(layout.lines[0]?.paths[0]?.path).toContain("M 4 0");
	});
});
