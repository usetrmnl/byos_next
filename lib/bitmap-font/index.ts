import {
	convertLegacyBitmapFont,
	convertLegacyFontFace,
	convertLegacyGlyph,
	convertLegacyMetrics,
	convertLegacyPackToV2,
	type ConvertLegacyFontOptions,
} from "./convert-legacy-font";
import {
	convertV2GlyphToLegacy,
	convertV2MetricsToLegacy,
	convertV2PackToLegacy,
	legacyFaceGridSize,
	legacyGlyphDataToBinary,
} from "./convert-v2-to-legacy";
import {
	isLegacyBitmapFontPack,
	isV2BitmapFont,
} from "./pack-utils";
import type { LegacyBitmapFontPack } from "./schema/legacy";
import type { NewBitmapFont } from "./schema/v2";
export { decodeCellData, base64CellDataToBinary, legacyGlyphRowStride } from "./decode-cell-data";
export {
	convertLegacyBitmapFont,
	convertLegacyFontFace,
	convertLegacyGlyph,
	convertLegacyMetrics,
	convertLegacyPackToV2,
	type ConvertLegacyFontOptions,
};
export {
	convertV2GlyphToLegacy,
	convertV2MetricsToLegacy,
	convertV2PackToLegacy,
	legacyFaceGridSize,
	legacyGlyphDataToBinary,
};
export {
	binaryToPath,
	getFontMetrics,
	getGlyphAdvance,
	getGlyphBitmapWidth,
	layoutBitmapText,
	type BitmapFontMetrics,
	type BitmapFontPack,
	type BitmapFontFace,
	type BitmapGlyph,
	type BitmapLayoutLine,
	type BitmapLayoutResult,
} from "./layout";
export {
	getV2BaselineEditorRow,
	getV2CellHeight,
	getV2DefaultAdvance,
	getV2LayoutHeight,
	getV2MetricGuides,
	editorRowToV2Y,
	glyphRunsToPath,
	binaryGridToGlyphRows,
	inkWidthFromBinary,
	layoutV2Text,
	v2GlyphToEditorBinary,
	v2YToEditorRow,
	type V2MetricGuide,
} from "./layout-v2";
export { deriveTypographyMetrics, shiftGlyphsToMetrics } from "./metrics-derive";
export {
	gridSizeKey,
	inferFaceWidth,
	inferMetricsFromGlyphs,
	isLegacyBitmapFontPack,
	isV2BitmapFont,
	listV2FaceKeys,
	parseGridSize,
	resolveV2Face,
	type ResolvedV2Face,
} from "./pack-utils";
export type {
	LegacyBitmapCharacter,
	LegacyBitmapFace,
	LegacyBitmapFontPack,
	LegacyFontMetrics,
} from "./schema/legacy";
export type {
	Glyph,
	GlyphBounds,
	GlyphRowRun,
	NewBitmapFont,
	NewBitmapFontFace,
	NewBitmapFontMetrics,
} from "./schema/v2";
export type { BitmapFontPackData } from "./packs";

/** Normalize any supported pack file into v2 format. */
export function normalizeToV2Pack(pack: unknown): NewBitmapFont {
	if (isV2BitmapFont(pack)) return pack;
	if (isLegacyBitmapFontPack(pack)) return convertLegacyPackToV2(pack);
	throw new Error("Unsupported bitmap font pack format");
}

/** Normalize any supported pack file into legacy format for the designer editor. */
export function normalizeToLegacyPack(pack: unknown): LegacyBitmapFontPack {
	if (isLegacyBitmapFontPack(pack)) return pack;
	if (isV2BitmapFont(pack)) return convertV2PackToLegacy(pack);
	throw new Error("Unsupported bitmap font pack format");
}
