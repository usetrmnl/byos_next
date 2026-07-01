import type { BitmapLayoutLine, BitmapLayoutResult } from "./layout";
import type { Glyph, GlyphRowRun, NewBitmapFontMetrics } from "./schema/v2";

/** Editor row index of the baseline (v2 y = 0). */
export function getV2BaselineEditorRow(
	metrics: NewBitmapFontMetrics,
	gridHeight?: number,
): number {
	const metricHeight = getV2CellHeight(metrics);
	const metricBaseline = metricHeight - 1 + metrics.minY;

	// A supplied grid height is the design band above/baseline-inclusive; descenders
	// are padded below it, matching the build-time metric trace layout.
	if (
		gridHeight != null &&
		gridHeight > 0 &&
		(gridHeight < metricHeight || metrics.minY < 0)
	) {
		return gridHeight - 1;
	}

	return metricBaseline;
}

export function v2YToEditorRow(
	y: number,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
): number {
	return getV2BaselineEditorRow(metrics, gridHeight) - y;
}

export function editorRowToV2Y(
	oldRow: number,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
): number {
	return getV2BaselineEditorRow(metrics, gridHeight) - oldRow;
}

/** Convert a top-left 0/1 grid from the editor into baseline-relative row runs. */
export function binaryGridToGlyphRows(
	binary: string,
	width: number,
	layoutHeight: number,
	metrics: NewBitmapFontMetrics,
	gridHeight?: number,
): GlyphRowRun[] {
	const rows: GlyphRowRun[] = [];
	const baselineGridHeight = gridHeight ?? layoutHeight;

	for (let oldRow = 0; oldRow < layoutHeight; oldRow++) {
		const runs: [number, number][] = [];
		let runStart = -1;

		for (let x = 0; x < width; x++) {
			const filled = binary[oldRow * width + x] === "1";
			if (filled && runStart < 0) runStart = x;
			if (!filled && runStart >= 0) {
				runs.push([runStart, x]);
				runStart = -1;
			}
		}

		if (runStart >= 0) runs.push([runStart, width]);
		if (runs.length === 0) continue;

		rows.push({
			y: editorRowToV2Y(oldRow, metrics, baselineGridHeight),
			runs,
		});
	}

	return rows;
}

/** Build top-left editor binary from a v2 glyph (matches preview ink). */
export function v2GlyphToEditorBinary(
	glyph: Glyph,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
): string {
	const dynamicWidth = metrics.dynamicWidth;
	const rowStride = dynamicWidth
		? Math.max(glyph.advance ?? 0, glyph.width ?? 0, 1)
		: Math.max(glyph.width ?? 0, glyph.advance ?? 0, 1);
	const layoutHeight = getV2LayoutHeight(metrics, gridHeight);
	const cells = Array.from({ length: layoutHeight * rowStride }, () => "0");

	for (const { y, runs } of glyph.rows) {
		const oldRow = v2YToEditorRow(y, metrics, gridHeight ?? layoutHeight);
		if (oldRow < 0 || oldRow >= layoutHeight) continue;

		for (const [startX, endX] of runs) {
			for (let x = startX; x < endX; x++) {
				if (x < 0 || x >= rowStride) continue;
				cells[oldRow * rowStride + x] = "1";
			}
		}
	}

	return cells.join("");
}

export function getV2CellHeight(metrics: NewBitmapFontMetrics): number {
	return metrics.maxY - metrics.minY + 1;
}

export function getV2LayoutHeight(
	metrics: NewBitmapFontMetrics,
	gridHeight?: number,
): number {
	const metricHeight = getV2CellHeight(metrics);
	if (gridHeight != null && gridHeight > 0) {
		return Math.max(
			gridHeight,
			metricHeight,
			gridHeight + Math.max(0, -metrics.minY),
		);
	}
	return metricHeight;
}

/** Width of the ink bounding box in a row-major 0/1 editor grid. */
export function inkWidthFromBinary(binary: string, rowWidth: number): number {
	if (rowWidth <= 0 || binary.length === 0) return 0;

	let maxX = -1;
	for (let index = 0; index < binary.length; index++) {
		if (binary[index] !== "1") continue;
		maxX = Math.max(maxX, index % rowWidth);
	}

	return maxX >= 0 ? maxX + 1 : 0;
}

export function glyphRunsToPath(rows: GlyphRowRun[], maxY: number): string {
	const parts: string[] = [];

	for (const { y, runs } of rows) {
		const svgY = maxY - y;
		for (const [startX, endX] of runs) {
			if (endX <= startX) continue;
			parts.push(
				`M ${startX} ${svgY} h ${endX - startX} v 1 h ${-(endX - startX)} z`,
			);
		}
	}

	return parts.join(" ");
}

export type V2MetricGuide = {
	label: string;
	metricY: number;
	svgY: number;
	emphasis: "strong" | "light";
};

/** Horizontal guide lines for preview/debug overlays (SVG y increases downward). */
export function getV2MetricGuides(
	metrics: NewBitmapFontMetrics,
	scale: number,
): V2MetricGuide[] {
	const toSvgY = (metricY: number) => (metrics.maxY - metricY) * scale;

	return [
		{
			label: "maxY",
			metricY: metrics.maxY,
			svgY: toSvgY(metrics.maxY),
			emphasis: "light",
		},
		{
			label: "capHeight",
			metricY: metrics.capHeightY,
			svgY: toSvgY(metrics.capHeightY),
			emphasis: "strong",
		},
		{
			label: "xHeight",
			metricY: metrics.xHeightY,
			svgY: toSvgY(metrics.xHeightY),
			emphasis: "strong",
		},
		{
			label: "baseline",
			metricY: metrics.baselineY,
			svgY: toSvgY(metrics.baselineY),
			emphasis: "strong",
		},
		{
			label: "descender",
			metricY: metrics.descenderY,
			svgY: toSvgY(metrics.descenderY),
			emphasis: "strong",
		},
		{
			label: "minY",
			metricY: metrics.minY,
			svgY: toSvgY(metrics.minY),
			emphasis: "light",
		},
	];
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

export function getV2DefaultCharGap(metrics: NewBitmapFontMetrics): number {
	return metrics.defaultCharGap ?? 0;
}

/** Font default char gap plus optional extra gap from the caller (e.g. preview slider). */
export function resolveV2CharGap(
	metrics: NewBitmapFontMetrics,
	extraGap = 0,
): number {
	return getV2DefaultCharGap(metrics) + extraGap;
}

export function layoutV2Text({
	text,
	glyphs,
	metrics,
	gridWidth,
	gridHeight,
	scale,
	gap,
}: {
	text: string;
	glyphs: Record<string, Glyph>;
	metrics: NewBitmapFontMetrics;
	gridWidth: number;
	gridHeight?: number;
	scale: number;
	gap: number;
}): BitmapLayoutResult {
	const cellHeight = getV2LayoutHeight(metrics, gridHeight);
	const cellSpan = cellHeight * scale;
	const lineStep = Math.max(cellSpan, metrics.lineGap * scale);
	const defaultAdvance =
		getV2DefaultAdvance(metrics, glyphs, gridWidth) * scale;
	const charGap = resolveV2CharGap(metrics, gap);
	const spaceAdvance = Math.ceil(defaultAdvance * 0.5) + charGap;

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
				lineWidth += defaultAdvance + charGap;
				return;
			}

			const advance = glyph.advance * scale;
			const path = glyphRunsToPath(glyph.rows, metrics.maxY);

			paths.push({
				path,
				x: lineWidth + glyph.leftBearing * scale,
				y: 0,
			});
			lineWidth += advance + charGap;
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
