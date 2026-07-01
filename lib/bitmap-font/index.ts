import {
	type ConvertLegacyFontOptions,
	convertLegacyBitmapFont,
	convertLegacyFontFace,
	convertLegacyGlyph,
	convertLegacyMetrics,
	convertLegacyPackToV2,
} from "./convert-legacy-font";
import {
	convertV2GlyphToLegacy,
	convertV2MetricsToLegacy,
	convertV2PackToLegacy,
	legacyFaceGridSize,
	legacyGlyphDataToBinary,
} from "./convert-v2-to-legacy";
import { isLegacyBitmapFontPack, isV2BitmapFont } from "./pack-utils";
import type { LegacyBitmapFontPack } from "./schema/legacy";
import type { NewBitmapFont } from "./schema/v2";

export {
	base64CellDataToBinary,
	decodeCellData,
	legacyGlyphRowStride,
} from "./decode-cell-data";
export {
	type BitmapFontFace,
	type BitmapFontMetrics,
	type BitmapFontPack,
	type BitmapGlyph,
	type BitmapLayoutLine,
	type BitmapLayoutResult,
	binaryToPath,
	getFontMetrics,
	getGlyphAdvance,
	getGlyphBitmapWidth,
	layoutBitmapText,
} from "./layout";
export {
	binaryGridToGlyphRows,
	editorRowToV2Y,
	getV2BaselineEditorRow,
	getV2CellHeight,
	getV2DefaultAdvance,
	getV2DefaultCharGap,
	getV2LayoutHeight,
	getV2MetricGuides,
	glyphRunsToPath,
	inkWidthFromBinary,
	layoutV2Text,
	resolveV2CharGap,
	type V2MetricGuide,
	v2GlyphToEditorBinary,
	v2YToEditorRow,
} from "./layout-v2";
export {
	deriveTypographyMetrics,
	shiftGlyphsToMetrics,
} from "./metrics-derive";
export {
	gridSizeKey,
	inferFaceWidth,
	inferMetricsFromGlyphs,
	isLegacyBitmapFontPack,
	isV2BitmapFont,
	listV2FaceKeys,
	parseGridSize,
	type ResolvedV2Face,
	resolveV2Face,
} from "./pack-utils";
export type { BitmapFontPackData } from "./packs";
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
export {
	type ConvertLegacyFontOptions,
	convertLegacyBitmapFont,
	convertLegacyFontFace,
	convertLegacyGlyph,
	convertLegacyMetrics,
	convertLegacyPackToV2,
	convertV2GlyphToLegacy,
	convertV2MetricsToLegacy,
	convertV2PackToLegacy,
	legacyFaceGridSize,
	legacyGlyphDataToBinary,
};

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
