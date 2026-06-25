import { decodeCellData, legacyGlyphRowStride } from "./decode-cell-data";
import type {
	LegacyBitmapCharacter,
	LegacyBitmapFace,
	LegacyBitmapFontPack,
	LegacyFontMetrics,
} from "./schema/legacy";
import { gridSizeKey } from "./pack-utils";
import type {
	Glyph,
	GlyphBounds,
	GlyphRowRun,
	NewBitmapFont,
	NewBitmapFontFace,
	NewBitmapFontMetrics,
} from "./schema/v2";

export type ConvertLegacyFontOptions = {
	/** Which face in `fonts[]` to convert. Defaults to 0. */
	fontIndex?: number;
	/** Prefer glyph keys from charCode instead of char. */
	useCharCodeKeys?: boolean;
};

export function convertLegacyMetrics(
	metrics: LegacyFontMetrics,
): NewBitmapFontMetrics {
	const {
		cellHeight,
		capTop,
		baselineRow,
		descenderDepth,
		xHeight,
		lineHeight,
		pixelUnitX = metrics.pixelUnit ?? 1,
		pixelUnitY = metrics.pixelUnit ?? 1,
		dynamicWidth = false,
	} = metrics;

	return {
		minY: baselineRow - (cellHeight - 1),
		descenderY: -descenderDepth,
		baselineY: 0,
		xHeightY: xHeight,
		capHeightY: baselineRow - capTop,
		maxY: baselineRow,
		lineGap: lineHeight,
		defaultCharGap: 0,
		pixelUnitX,
		pixelUnitY,
		dynamicWidth,
	};
}

function rowToRuns(row: boolean[]): [number, number][] {
	const runs: [number, number][] = [];
	let index = 0;

	while (index < row.length) {
		if (!row[index]) {
			index++;
			continue;
		}

		const startX = index;
		while (index < row.length && row[index]) {
			index++;
		}
		runs.push([startX, index]);
	}

	return runs;
}

function emptyBounds(): GlyphBounds {
	return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

export function convertLegacyGlyph(
	character: LegacyBitmapCharacter,
	face: LegacyBitmapFace,
	metrics: LegacyFontMetrics,
): Glyph {
	const cellHeight = metrics.cellHeight ?? face.height;
	const baselineRow = metrics.baselineRow;
	const dynamicWidth = metrics.dynamicWidth ?? face.width === 0;
	const rowStride = legacyGlyphRowStride(character, face, dynamicWidth);
	const glyphWidth = character.width ?? (face.width > 0 ? face.width : rowStride);
	const grid = decodeCellData(character.data, rowStride, cellHeight);

	const rows: GlyphRowRun[] = [];
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (let oldRow = 0; oldRow < cellHeight; oldRow++) {
		const row = grid[oldRow] ?? [];
		const runs = rowToRuns(row);
		if (runs.length === 0) continue;

		const y = baselineRow - oldRow;
		rows.push({ y, runs });

		for (const [startX, endX] of runs) {
			minX = Math.min(minX, startX);
			maxX = Math.max(maxX, endX - 1);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	const bounds =
		rows.length === 0
			? emptyBounds()
			: {
				minX,
				maxX: maxX + 1,
				minY,
				maxY,
			};

	return {
		charCode: character.charCode,
		char: character.char,
		width: glyphWidth,
		advance: character.advance ?? glyphWidth,
		leftBearing: 0,
		bounds,
		rows,
	};
}

function glyphKey(character: LegacyBitmapCharacter, useCharCodeKeys: boolean): string {
	if (useCharCodeKeys) return String(character.charCode);
	return character.char.length > 0 ? character.char : String(character.charCode);
}

export function convertLegacyFontFace(
	face: LegacyBitmapFace,
	metrics: LegacyFontMetrics,
	options: ConvertLegacyFontOptions = {},
): Record<string, Glyph> {
	const glyphs: Record<string, Glyph> = {};
	const useCharCodeKeys = options.useCharCodeKeys ?? false;

	for (const character of face.characters) {
		const key = glyphKey(character, useCharCodeKeys);
		glyphs[key] = convertLegacyGlyph(character, face, metrics);
	}

	return glyphs;
}

export function convertLegacyBitmapFont(
	pack: LegacyBitmapFontPack,
	options: ConvertLegacyFontOptions = {},
): NewBitmapFont {
	const fontIndex = options.fontIndex ?? 0;
	const face = pack.fonts[fontIndex];

	if (!face) {
		throw new Error(`Legacy font face at index ${fontIndex} not found`);
	}

	const legacyMetrics = pack.metadata?.metrics;
	if (!legacyMetrics) {
		throw new Error("Legacy font pack is missing metadata.metrics");
	}

	const metrics = convertLegacyMetrics(legacyMetrics);

	return {
		metadata: {
			name: pack.metadata?.name ?? "Bitmap Font",
			creator: pack.metadata?.creator,
			createdAt: pack.metadata?.createdAt,
			version: pack.metadata?.version ?? "2.0",
			description: pack.metadata?.description,
			metrics,
		},
		glyphs: convertLegacyFontFace(face, legacyMetrics, options),
	};
}

export function convertLegacyPackToV2(
	pack: LegacyBitmapFontPack,
	options: ConvertLegacyFontOptions = {},
): NewBitmapFont {
	const legacyMetrics = pack.metadata?.metrics;
	if (!legacyMetrics) {
		throw new Error("Legacy font pack is missing metadata.metrics");
	}

	const metrics = convertLegacyMetrics(legacyMetrics);
	const metadata = {
		name: pack.metadata?.name ?? "Bitmap Font",
		creator: pack.metadata?.creator,
		createdAt: pack.metadata?.createdAt,
		version: pack.metadata?.version ?? "2.0",
		description: pack.metadata?.description,
		metrics,
	};

	if (pack.fonts.length <= 1) {
		const face = pack.fonts[0];
		if (!face) {
			throw new Error("Legacy font pack has no faces");
		}

		const faceLegacyMetrics = face.metrics ?? legacyMetrics;
		const faceMetrics = convertLegacyMetrics(faceLegacyMetrics);

		return {
			metadata: {
				...metadata,
				metrics: faceMetrics,
			},
			glyphs: convertLegacyFontFace(face, faceLegacyMetrics, options),
		};
	}

	const faces: Record<string, NewBitmapFontFace> = {};
	for (const face of pack.fonts) {
		const faceLegacyMetrics = face.metrics ?? legacyMetrics;
		const key = gridSizeKey(face.width, face.height);
		faces[key] = {
			metrics: convertLegacyMetrics(faceLegacyMetrics),
			glyphs: convertLegacyFontFace(face, faceLegacyMetrics, options),
		};
	}

	return { metadata, faces };
}
