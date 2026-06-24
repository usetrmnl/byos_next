import type { Glyph, GlyphRowRun, NewBitmapFontMetrics } from "./schema/v2";
import type { BitmapLayoutLine, BitmapLayoutResult } from "./layout";

export function getV2CellHeight(metrics: NewBitmapFontMetrics): number {
	return metrics.maxY - metrics.minY + 1;
}

export function glyphRunsToPath(rows: GlyphRowRun[], maxY: number): string {
	const parts: string[] = [];

	for (const { y, runs } of rows) {
		const svgY = maxY - y;
		for (const [startX, endX] of runs) {
			if (endX <= startX) continue;
			parts.push(`M ${startX} ${svgY} h ${endX - startX} v 1 h ${-(endX - startX)} z`);
		}
	}

	return parts.join(" ");
}

export function lookupV2Glyph(
	glyphs: Record<string, Glyph>,
	char: string,
): Glyph | undefined {
	const direct = glyphs[char];
	if (direct) return direct;

	const charCode = char.charCodeAt(0);
	return glyphs[String(charCode)];
}

export function getV2DefaultAdvance(
	metrics: NewBitmapFontMetrics,
	glyphs: Record<string, Glyph>,
	gridWidth: number,
): number {
	if (metrics.dynamicWidth) {
		const probe = lookupV2Glyph(glyphs, "M") ?? lookupV2Glyph(glyphs, "0");
		if (probe) return probe.advance;
		return Math.max(8, metrics.pixelUnitX * 8);
	}

	if (gridWidth > 0) return gridWidth;
	const first = Object.values(glyphs)[0];
	return first?.advance ?? first?.width ?? 8;
}

export function layoutV2Text({
	text,
	glyphs,
	metrics,
	gridWidth,
	scale,
	gap,
}: {
	text: string;
	glyphs: Record<string, Glyph>;
	metrics: NewBitmapFontMetrics;
	gridWidth: number;
	scale: number;
	gap: number;
}): BitmapLayoutResult {
	const cellHeight = getV2CellHeight(metrics);
	const lineStep = metrics.lineGap * scale;
	const cellSpan = cellHeight * scale;
	const defaultAdvance = getV2DefaultAdvance(metrics, glyphs, gridWidth) * scale;
	const spaceAdvance = Math.ceil(defaultAdvance * 0.5) + gap;

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

			const glyph = lookupV2Glyph(glyphs, char);
			if (!glyph) {
				lineWidth += defaultAdvance + gap;
				return;
			}

			const advance = glyph.advance * scale;
			const path = glyphRunsToPath(glyph.rows, metrics.maxY);

			paths.push({
				path,
				x: lineWidth + glyph.leftBearing * scale,
				y: 0,
			});
			lineWidth += advance + gap;
		});

		layoutLines.push({ paths, width: lineWidth });
		totalWidth = Math.max(totalWidth, lineWidth);
	});

	const height =
		lines.length > 0 ? cellSpan + (lines.length - 1) * lineStep : cellSpan;

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
