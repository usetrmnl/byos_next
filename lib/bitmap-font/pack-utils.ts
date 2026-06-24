import type { LegacyBitmapFontPack } from "./schema/legacy";
import type {
	Glyph,
	NewBitmapFont,
	NewBitmapFontFace,
	NewBitmapFontMetrics,
} from "./schema/v2";

export type ResolvedV2Face = {
	gridSize: string;
	gridWidth: number;
	gridHeight: number;
	metrics: NewBitmapFontMetrics;
	glyphs: Record<string, Glyph>;
};

export function isLegacyBitmapFontPack(
	pack: unknown,
): pack is LegacyBitmapFontPack {
	return (
		typeof pack === "object" &&
		pack !== null &&
		"fonts" in pack &&
		Array.isArray((pack as LegacyBitmapFontPack).fonts)
	);
}

export function isV2BitmapFont(pack: unknown): pack is NewBitmapFont {
	if (typeof pack !== "object" || pack === null) return false;
	const candidate = pack as NewBitmapFont;
	return (
		"metadata" in candidate &&
		typeof candidate.metadata?.metrics?.baselineY === "number" &&
		("glyphs" in candidate || "faces" in candidate)
	);
}

export function gridSizeKey(width: number, height: number): string {
	return width > 0 ? `${width}x${height}` : `0x${height}`;
}

export function parseGridSize(gridSize: string): [number, number] {
	const [width, height] = gridSize.split("x").map(Number);
	return [width, height];
}

export function inferFaceWidth(
	glyphs: Record<string, Glyph>,
	dynamicWidth: boolean,
): number {
	if (dynamicWidth) return 0;
	let maxWidth = 0;
	for (const glyph of Object.values(glyphs)) {
		maxWidth = Math.max(maxWidth, glyph.width);
	}
	return maxWidth > 0 ? maxWidth : 8;
}

export function listV2FaceKeys(pack: NewBitmapFont): string[] {
	if (pack.faces && Object.keys(pack.faces).length > 0) {
		return Object.keys(pack.faces);
	}

	const metrics = pack.metadata.metrics;
	const height = metrics.maxY - metrics.minY + 1;
	const width = inferFaceWidth(pack.glyphs ?? {}, metrics.dynamicWidth);
	return [gridSizeKey(width, height)];
}

export function resolveV2Face(
	pack: NewBitmapFont,
	gridSize?: string,
): ResolvedV2Face | null {
	const faceKeys = listV2FaceKeys(pack);
	if (faceKeys.length === 0) return null;

	let selectedKey = gridSize && faceKeys.includes(gridSize) ? gridSize : faceKeys[0];

	if (gridSize && !faceKeys.includes(gridSize)) {
		const [, requestedHeight] = parseGridSize(gridSize);
		const heightMatch = faceKeys.find((key) => {
			const [, height] = parseGridSize(key);
			return height === requestedHeight;
		});
		if (heightMatch) selectedKey = heightMatch;
	}

	const [gridWidth, gridHeight] = parseGridSize(selectedKey);
	const face: NewBitmapFontFace | undefined = pack.faces?.[selectedKey];

	return {
		gridSize: selectedKey,
		gridWidth,
		gridHeight,
		metrics: face?.metrics ?? pack.metadata.metrics,
		glyphs: face?.glyphs ?? pack.glyphs ?? {},
	};
}
