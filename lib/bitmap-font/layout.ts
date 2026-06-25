export type BitmapFontMetrics = {
	renderSize?: number;
	cellHeight?: number;
	cellWidth?: number;
	capTop?: number;
	baselineRow?: number;
	descenderDepth?: number;
	xHeight?: number;
	lineHeight?: number;
	pixelUnit?: number;
	pixelUnitX?: number;
	pixelUnitY?: number;
	dynamicWidth?: boolean;
	/** v2 typographic coordinates (baseline = 0). Used by the font designer. */
	minY?: number;
	maxY?: number;
	capHeightY?: number;
	xHeightY?: number;
	descenderY?: number;
	baselineY?: number;
	defaultCharGap?: number;
};

export type BitmapGlyph = {
	charCode: number;
	char?: string;
	data: string;
	width?: number;
	advance?: number;
};

export type BitmapFontFace = {
	width: number;
	height: number;
	characters: BitmapGlyph[];
};

export type BitmapFontPack = {
	metadata?: Record<string, unknown> & {
		metrics?: BitmapFontMetrics;
	};
	fonts: BitmapFontFace[];
};

export function getFontMetrics(
	pack: BitmapFontPack,
	font: BitmapFontFace,
): BitmapFontMetrics {
	const metrics = pack.metadata?.metrics ?? {};
	return {
		dynamicWidth: metrics.dynamicWidth ?? false,
		lineHeight: metrics.lineHeight ?? font.height,
		cellHeight: metrics.cellHeight ?? font.height,
		...metrics,
	};
}

export function getGlyphAdvance(
	glyph: BitmapGlyph,
	font: BitmapFontFace,
	metrics: BitmapFontMetrics,
): number {
	if (glyph.advance && glyph.advance > 0) return glyph.advance;
	if (glyph.width && glyph.width > 0) return glyph.width;
	if (metrics.dynamicWidth) return Math.max(1, glyph.width ?? font.width);
	return font.width;
}

export function getGlyphBitmapWidth(
	glyph: BitmapGlyph,
	font: BitmapFontFace,
): number {
	if (glyph.width && glyph.width > 0) return glyph.width;
	return font.width;
}

export type BitmapLayoutLine = {
	paths: Array<{ path: string; x: number; y: number }>;
	width: number;
};

export type BitmapLayoutResult = {
	width: number;
	height: number;
	lines: BitmapLayoutLine[];
};

export function binaryToPath(
	binary: string,
	bitmapWidth: number,
	fontHeight: number,
): string {
	const binaryArray = binary.padEnd(bitmapWidth * fontHeight, "0").slice(0, bitmapWidth * fontHeight);
	return Array.from({ length: bitmapWidth * fontHeight })
		.map((_, i) => {
			if (i >= binaryArray.length || binaryArray[i] !== "1") return "";
			const x = i % bitmapWidth;
			const y = Math.floor(i / bitmapWidth);
			return `M ${x} ${y} h 1 v 1 h -1 z`;
		})
		.filter(Boolean)
		.join(" ");
}

export function layoutBitmapText({
	text,
	font,
	charMap,
	glyphMeta,
	metrics,
	scale,
	gap,
}: {
	text: string;
	font: BitmapFontFace;
	charMap: Map<number, string>;
	glyphMeta?: Map<number, { width?: number; advance?: number }>;
	metrics: BitmapFontMetrics;
	scale: number;
	gap: number;
}): BitmapLayoutResult {
	const fontHeight = font.height;
	const cellHeight = (metrics.cellHeight ?? fontHeight) * scale;
	const lineStep = Math.max(
		cellHeight,
		(metrics.lineHeight ?? fontHeight) * scale,
	);
	const defaultAdvance =
		(metrics.dynamicWidth
			? (metrics.cellWidth ?? fontHeight)
			: font.width || fontHeight) * scale;
	const spaceAdvance =
		(metrics.dynamicWidth ? Math.ceil(defaultAdvance * 0.5) : defaultAdvance * 0.5) +
		gap;

	const lines = text.split("\n");
	const layoutLines: BitmapLayoutLine[] = [];
	let totalWidth = 0;

	lines.forEach((line) => {
		let lineWidth = 0;
		const paths: Array<{ path: string; x: number; y: number }> = [];

		Array.from(line).forEach((char) => {
			if (char === " ") {
				lineWidth += spaceAdvance;
				return;
			}

			const charCode = char.charCodeAt(0);
			const binary = charMap.get(charCode);
			if (!binary) {
				lineWidth += defaultAdvance + gap;
				return;
			}

			const meta = glyphMeta?.get(charCode);
			const glyph: BitmapGlyph = {
				charCode,
				data: binary,
				width: meta?.width,
				advance: meta?.advance,
			};

			const bitmapWidth = getGlyphBitmapWidth(glyph, font);
			const advance = getGlyphAdvance(glyph, font, metrics) * scale;
			const path = binaryToPath(binary, bitmapWidth, fontHeight);

			paths.push({ path, x: lineWidth, y: 0 });
			lineWidth += advance + gap;
		});

		layoutLines.push({ paths, width: lineWidth });
		totalWidth = Math.max(totalWidth, lineWidth);
	});

	const height =
		lines.length > 0 ? cellHeight + (lines.length - 1) * lineStep : cellHeight;

	return {
		width: totalWidth > 0 ? totalWidth : 100,
		height,
		lines: layoutLines.map((line, index) => ({
			...line,
			paths: line.paths.map((item) => ({
				...item,
				y: index * lineStep,
			})),
		})),
	};
}
