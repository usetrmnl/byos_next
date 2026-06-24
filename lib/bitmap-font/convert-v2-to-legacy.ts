import { base64CellDataToBinary } from "./decode-cell-data";
import type {
	LegacyBitmapCharacter,
	LegacyBitmapFace,
	LegacyBitmapFontPack,
	LegacyFontMetrics,
} from "./schema/legacy";
import type { Glyph, NewBitmapFont, NewBitmapFontMetrics } from "./schema/v2";
import {
	gridSizeKey,
	inferFaceWidth,
	listV2FaceKeys,
	parseGridSize,
} from "./pack-utils";

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
): LegacyFontMetrics {
	const cellHeight = metrics.maxY - metrics.minY + 1;
	const baselineRow = metrics.maxY;

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
): LegacyBitmapCharacter {
	const cellHeight = metrics.maxY - metrics.minY + 1;
	const baselineRow = metrics.maxY;
	const width = glyph.width;
	const grid = Array.from({ length: cellHeight }, () =>
		Array.from({ length: width }, () => false),
	);

	for (const { y, runs } of glyph.rows) {
		const oldRow = baselineRow - y;
		if (oldRow < 0 || oldRow >= cellHeight) continue;

		for (const [startX, endX] of runs) {
			for (let x = startX; x < endX; x++) {
				if (x >= 0 && x < width) {
					grid[oldRow][x] = true;
				}
			}
		}
	}

	const binary = grid.flat().map((filled) => (filled ? "1" : "0")).join("");

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
): LegacyBitmapFace {
	const [parsedWidth, parsedHeight] = parseGridSize(faceKey);
	const width =
		parsedWidth > 0
			? parsedWidth
			: inferFaceWidth(glyphs, metrics.dynamicWidth);
	const height = parsedHeight > 0 ? parsedHeight : metrics.maxY - metrics.minY + 1;

	return {
		width,
		height,
		characters: Object.values(glyphs)
			.map((glyph) => convertV2GlyphToLegacy(glyph, metrics))
			.sort((a, b) => a.charCode - b.charCode),
	};
}

export function convertV2PackToLegacy(pack: NewBitmapFont): LegacyBitmapFontPack {
	const sharedMetrics = pack.metadata.metrics;
	const legacyMetrics = convertV2MetricsToLegacy(sharedMetrics);
	const faceKeys = listV2FaceKeys(pack);

	const fonts = faceKeys.map((faceKey) => {
		const faceMetrics = pack.faces?.[faceKey]?.metrics ?? sharedMetrics;
		const glyphs = pack.faces?.[faceKey]?.glyphs ?? pack.glyphs ?? {};
		return convertV2FaceToLegacy(faceKey, glyphs, faceMetrics);
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
	if (/^[01]+$/.test(data)) {
		return data.padEnd(width * height, "0").slice(0, width * height);
	}

	try {
		const binary = base64CellDataToBinary(data);
		return binary.padEnd(width * height, "0").slice(0, width * height);
	} catch {
		return "0".repeat(width * height);
	}
}

export function legacyFaceGridSize(face: LegacyBitmapFace): string {
	return gridSizeKey(face.width, face.height);
}
