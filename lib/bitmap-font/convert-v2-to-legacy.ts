import { base64CellDataToBinary } from "./decode-cell-data";
import { getV2BaselineEditorRow, getV2LayoutHeight } from "./layout-v2";
import {
	gridSizeKey,
	inferFaceWidth,
	listV2FaceKeys,
	parseGridSize,
} from "./pack-utils";
import type {
	LegacyBitmapCharacter,
	LegacyBitmapFace,
	LegacyBitmapFontPack,
	LegacyFontMetrics,
} from "./schema/legacy";
import type { Glyph, NewBitmapFont, NewBitmapFontMetrics } from "./schema/v2";

function binaryToBase64(binary: string): string {
	const bytes: number[] = [];
	for (let index = 0; index < binary.length; index += 8) {
		const chunk = binary.slice(index, Math.min(index + 8, binary.length));
		if (chunk.length === 0) continue;
		bytes.push(Number.parseInt(chunk.padEnd(8, "0"), 2));
	}
	return btoa(String.fromCharCode(...bytes));
}

export function convertV2MetricsToLegacy(
	metrics: NewBitmapFontMetrics,
	gridHeight?: number,
): LegacyFontMetrics {
	const cellHeight = getV2LayoutHeight(metrics, gridHeight);
	const baselineRow =
		gridHeight != null && gridHeight > 0
			? getV2BaselineEditorRow(metrics, gridHeight)
			: cellHeight - 1 + metrics.minY;

	return {
		cellHeight,
		capTop: baselineRow - metrics.capHeightY,
		baselineRow,
		descenderDepth: -metrics.descenderY,
		xHeight: metrics.xHeightY,
		lineHeight: metrics.lineGap,
		pixelUnitX: metrics.pixelUnitX,
		pixelUnitY: metrics.pixelUnitY,
		dynamicWidth: metrics.dynamicWidth,
	};
}

export function convertV2GlyphToLegacy(
	glyph: Glyph,
	metrics: NewBitmapFontMetrics,
	faceWidth: number,
	faceHeight: number,
): LegacyBitmapCharacter {
	const dynamicWidth = metrics.dynamicWidth ?? faceWidth === 0;
	const rowStride = dynamicWidth
		? Math.max(glyph.advance ?? 0, glyph.width ?? 0, 1)
		: faceWidth > 0
			? faceWidth
			: glyph.width;
	const cellHeight = getV2LayoutHeight(
		metrics,
		faceHeight > 0 ? faceHeight : undefined,
	);
	const baselineRow =
		faceHeight > 0
			? getV2BaselineEditorRow(metrics, faceHeight)
			: getV2BaselineEditorRow(metrics);
	const grid = Array.from({ length: cellHeight }, () =>
		Array.from({ length: rowStride }, () => false),
	);

	for (const { y, runs } of glyph.rows) {
		const oldRow = baselineRow - y;
		if (oldRow < 0 || oldRow >= cellHeight) continue;

		for (const [startX, endX] of runs) {
			for (let x = startX; x < endX; x++) {
				if (x >= 0 && x < rowStride) {
					grid[oldRow][x] = true;
				}
			}
		}
	}

	const binary = grid
		.flat()
		.map((filled) => (filled ? "1" : "0"))
		.join("");

	return {
		charCode: glyph.charCode,
		char: glyph.char,
		data: binaryToBase64(binary),
		width: glyph.width,
		advance: glyph.advance,
	};
}

function convertV2FaceToLegacy(
	faceKey: string,
	glyphs: Record<string, Glyph>,
	metrics: NewBitmapFontMetrics,
	useDesignGridHeight: boolean,
): LegacyBitmapFace {
	const [parsedWidth, parsedHeight] = parseGridSize(faceKey);
	const designGridHeight =
		useDesignGridHeight && parsedHeight > 0 ? parsedHeight : undefined;
	const width =
		parsedWidth > 0
			? parsedWidth
			: inferFaceWidth(glyphs, metrics.dynamicWidth);
	const height = getV2LayoutHeight(metrics, designGridHeight);

	return {
		width,
		height,
		characters: Object.values(glyphs)
			.map((glyph) =>
				convertV2GlyphToLegacy(glyph, metrics, width, designGridHeight ?? 0),
			)
			.sort((a, b) => a.charCode - b.charCode),
		metrics: convertV2MetricsToLegacy(metrics, designGridHeight),
	};
}

export function convertV2PackToLegacy(
	pack: NewBitmapFont,
): LegacyBitmapFontPack {
	const sharedMetrics = pack.metadata.metrics;
	const legacyMetrics = convertV2MetricsToLegacy(sharedMetrics);
	const faceKeys = listV2FaceKeys(pack);

	const fonts = faceKeys.map((faceKey) => {
		const face = pack.faces?.[faceKey];
		const glyphs = face?.glyphs ?? pack.glyphs ?? {};
		const faceMetrics = face?.metrics ?? sharedMetrics;
		return convertV2FaceToLegacy(faceKey, glyphs, faceMetrics, Boolean(face));
	});

	return {
		metadata: {
			name: pack.metadata.name,
			creator: pack.metadata.creator,
			createdAt: pack.metadata.createdAt,
			version: pack.metadata.version,
			description: pack.metadata.description,
			metrics: legacyMetrics,
		},
		fonts,
	};
}

/** Decode legacy base64 glyph data to a 0/1 binary string for the designer editor. */
export function legacyGlyphDataToBinary(
	data: string,
	width: number,
	height: number,
): string {
	const expected = width * height;
	let binary: string;

	if (/^[01]+$/.test(data)) {
		binary = data;
	} else {
		try {
			binary = base64CellDataToBinary(data);
		} catch {
			return "0".repeat(expected);
		}
	}

	if (binary.length === expected) {
		return binary;
	}

	// Same width, fewer rows — pad empty rows at the bottom.
	if (binary.length < expected && width > 0 && binary.length % width === 0) {
		return binary.padEnd(expected, "0");
	}

	// Row-major with a narrower stored width (e.g. 7-wide rows in an 8-wide grid).
	if (binary.length < expected && height > 0 && binary.length % height === 0) {
		const sourceWidth = binary.length / height;
		if (sourceWidth > 0 && sourceWidth !== width) {
			const rows: string[] = [];
			for (let y = 0; y < height; y++) {
				rows.push(
					binary
						.slice(y * sourceWidth, (y + 1) * sourceWidth)
						.padEnd(width, "0"),
				);
			}
			return rows.join("").slice(0, expected);
		}
	}

	return binary.padEnd(expected, "0").slice(0, expected);
}

export function legacyFaceGridSize(face: LegacyBitmapFace): string {
	return gridSizeKey(face.width, face.height);
}
