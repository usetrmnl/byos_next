import type { BitmapFontMetrics } from "@/lib/bitmap-font/layout";
import {
	binaryGridToGlyphRows,
	getV2LayoutHeight,
	v2GlyphToEditorBinary,
	v2YToEditorRow,
} from "@/lib/bitmap-font/layout-v2";
import type {
	Glyph,
	GlyphBounds,
	GlyphRowRun,
	NewBitmapFontMetrics,
} from "@/lib/bitmap-font/schema/v2";

// Convert base64 to binary string (for JSON storage)
export const base64ToBinary = (base64: string): string => {
	// Decode base64 to binary
	const binary = atob(base64);
	// Convert each byte to its binary representation
	return Array.from(binary)
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("");
};

// Convert binary string to base64 (for JSON storage)
export const binaryToBase64 = (binary: string): string => {
	// Group binary string into 8-bit chunks
	const bytes = [];
	for (let i = 0; i < binary.length; i += 8) {
		const chunk = binary.slice(i, Math.min(i + 8, binary.length));
		// Only process complete or padded chunks
		if (chunk.length > 0) {
			const paddedChunk = chunk.padEnd(8, "0");
			bytes.push(parseInt(paddedChunk, 2));
		}
	}

	// Convert bytes to base64
	return btoa(String.fromCharCode(...bytes));
};

export const parseEditorGridSize = (gridSize: string): [number, number] => {
	const [width, height] = gridSize.split("x").map(Number);
	return [width, height];
};

export const getEffectiveGlyphWidth = (
	gridSize: string,
	charCode: number,
	glyphMeta?: Map<number, { width?: number; advance?: number }>,
): number => {
	const [gridWidth] = parseEditorGridSize(gridSize);
	if (gridWidth > 0) return gridWidth;

	const meta = glyphMeta?.get(charCode);
	return meta?.advance ?? meta?.width ?? 8;
};

/** Row stride for decoding editor/grid binary (advance when dynamic). */
export const getGlyphBitmapStride = getEffectiveGlyphWidth;

// Convert binary string to 2D grid
export const binaryToGrid = (
	binary: string,
	width: number,
	height: number,
): number[][] => {
	const grid: number[][] = [];

	// Ensure binary string is the correct length
	const paddedBinary = binary.padEnd(width * height, "0");

	for (let y = 0; y < height; y++) {
		const row: number[] = [];
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			row.push(Number(paddedBinary[index]));
		}
		grid.push(row);
	}
	return grid;
};

// Convert 2D grid to binary string
export const gridToBinary = (grid: number[][]): string => {
	return grid.flat().join("");
};

/** Fixed Y slider limits (v2 coordinates, baseline = 0). */
export const METRIC_Y_SLIDER_MIN = -8;
export const METRIC_Y_SLIDER_MAX = 32;
/** Symmetric track so y=0 sits at slider center; negatives left, positives right. */
export const METRIC_Y_SLIDER_SYMMETRIC = METRIC_Y_SLIDER_MAX;

export function clampMetricY(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export type EditorFontMetrics = {
	baselineRow: number;
	capTop: number;
	xHeightRow: number;
	xHeightY: number;
	capHeightY: number;
	descenderDepth: number;
	descenderRow: number;
	descenderY: number;
	minY: number;
	maxY: number;
	minYRow: number;
	maxYRow: number;
	cellHeight: number;
	lineHeight: number;
	baselineY: number;
};

/** Merge v2 metric edits with legacy row fields used by save/export. */
export function syncPackMetricsFromV2(
	current: BitmapFontMetrics,
	partial: Partial<BitmapFontMetrics>,
	baselineRow: number,
): BitmapFontMetrics {
	const merged = { ...current, ...partial, baselineRow, baselineY: 0 };

	const capHeightY = clampMetricY(
		merged.capHeightY ??
			merged.maxY ??
			Math.max(0, baselineRow - (merged.capTop ?? 0)),
		0,
		METRIC_Y_SLIDER_MAX,
	);
	const maxY = clampMetricY(
		Math.max(capHeightY, merged.maxY ?? capHeightY),
		0,
		METRIC_Y_SLIDER_MAX,
	);
	const xHeightY = clampMetricY(
		Math.min(
			merged.xHeightY ?? merged.xHeight ?? Math.max(1, Math.floor(maxY * 0.6)),
			maxY,
		),
		0,
		maxY,
	);
	const descenderY = clampMetricY(
		merged.descenderY ?? merged.minY ?? -(merged.descenderDepth ?? 0),
		METRIC_Y_SLIDER_MIN,
		0,
	);
	const minY = clampMetricY(
		Math.min(descenderY, merged.minY ?? descenderY),
		METRIC_Y_SLIDER_MIN,
		0,
	);
	const descenderDepth = Math.max(0, -descenderY);
	const cellHeight = merged.cellHeight ?? maxY - minY + 1;

	return {
		...merged,
		capHeightY,
		maxY,
		xHeightY,
		xHeight: xHeightY,
		minY,
		descenderY,
		descenderDepth,
		capTop: baselineRow - capHeightY,
		cellHeight,
	};
}

export function packMetricsFromV2Metrics(
	v2: NewBitmapFontMetrics,
	legacy: BitmapFontMetrics,
): BitmapFontMetrics {
	return syncPackMetricsFromV2(
		{ ...legacy, ...v2 },
		{},
		legacy.baselineRow ?? 0,
	);
}

export const resolveEditorFontMetrics = (
	height: number,
	packMetrics?: BitmapFontMetrics,
): EditorFontMetrics => {
	const cellHeight = packMetrics?.cellHeight ?? height;
	const baselineRow = packMetrics?.baselineRow ?? height - 1;
	const capHeightY =
		packMetrics?.capHeightY ??
		Math.max(0, baselineRow - (packMetrics?.capTop ?? 0));
	const maxY = packMetrics?.maxY ?? capHeightY;
	const xHeightY =
		packMetrics?.xHeightY ??
		packMetrics?.xHeight ??
		Math.max(1, Math.floor(maxY * 0.6));
	const descenderY =
		packMetrics?.descenderY ?? -(packMetrics?.descenderDepth ?? 0);
	const minY = packMetrics?.minY ?? descenderY;

	const capTop = baselineRow - capHeightY;
	const xHeightRow = baselineRow - xHeightY;
	const descenderDepth = Math.max(0, -descenderY);
	const descenderRow = Math.min(height - 1, baselineRow - descenderY);
	const minYRow = Math.min(height - 1, Math.max(0, baselineRow - minY));
	const maxYRow = Math.max(0, baselineRow - maxY);

	return {
		baselineRow,
		capTop,
		xHeightRow,
		xHeightY,
		capHeightY,
		descenderDepth,
		descenderRow,
		descenderY,
		minY,
		maxY,
		minYRow,
		maxYRow,
		cellHeight,
		lineHeight: packMetrics?.lineHeight ?? height,
		baselineY: 0,
	};
};

export type InkBounds = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

export const computeInkBoundsFromGrid = (
	grid: number[][],
	baselineRow: number,
): InkBounds | null => {
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (let row = 0; row < grid.length; row++) {
		for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
			if (!grid[row]?.[col]) continue;
			minX = Math.min(minX, col);
			maxX = Math.max(maxX, col);
			const y = baselineRow - row;
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	if (!Number.isFinite(minX)) return null;
	return { minX, maxX, minY, maxY };
};

/** Normalize pack metrics for legacy save/export. */
export function packMetricsToLegacySave(
	packMetrics: BitmapFontMetrics,
	gridHeight?: number,
): BitmapFontMetrics {
	const height = gridHeight ?? packMetrics.cellHeight ?? 8;
	const baselineRow = packMetrics.baselineRow ?? height - 1;
	return syncPackMetricsFromV2(packMetrics, {}, baselineRow);
}

/** V2 metrics for layout/preview from designer packMetrics (preserves maxY, minY, etc.). */
export function packMetricsToV2PreviewMetrics(
	packMetrics: BitmapFontMetrics,
	fallbacks: NewBitmapFontMetrics,
): NewBitmapFontMetrics {
	return {
		minY: packMetrics.minY ?? fallbacks.minY,
		descenderY: packMetrics.descenderY ?? fallbacks.descenderY,
		baselineY: 0,
		xHeightY: packMetrics.xHeightY ?? packMetrics.xHeight ?? fallbacks.xHeightY,
		capHeightY: packMetrics.capHeightY ?? fallbacks.capHeightY,
		maxY: packMetrics.maxY ?? fallbacks.maxY,
		lineGap:
			packMetrics.lineHeight ?? packMetrics.cellHeight ?? fallbacks.lineGap,
		defaultCharGap: packMetrics.defaultCharGap ?? fallbacks.defaultCharGap ?? 0,
		pixelUnitX:
			packMetrics.pixelUnitX ?? packMetrics.pixelUnit ?? fallbacks.pixelUnitX,
		pixelUnitY:
			packMetrics.pixelUnitY ?? packMetrics.pixelUnit ?? fallbacks.pixelUnitY,
		dynamicWidth: packMetrics.dynamicWidth ?? fallbacks.dynamicWidth,
	};
}

/** v2 row runs stored per glyph in the designer (avoids flat-binary stride wrap). */
export type EditorGlyph = {
	rows: GlyphRowRun[];
	width: number;
	advance: number;
};

/** Crop or pad rows to the right when glyph width changes — no row wrapping. */
/** Shift ink vertically in editor row space; pixels outside the grid are dropped. */
export const shiftEditorGridVertical = (
	grid: number[][],
	deltaRows: number,
	height: number,
): number[][] => {
	const width = grid[0]?.length ?? 0;
	const shifted = Array.from({ length: height }, () =>
		Array.from({ length: width }, () => 0),
	);

	for (let row = 0; row < grid.length; row++) {
		const targetRow = row + deltaRows;
		if (targetRow < 0 || targetRow >= height) continue;
		for (let col = 0; col < width; col++) {
			shifted[targetRow][col] = grid[row]?.[col] ?? 0;
		}
	}

	return shifted;
};

export const shiftBinaryVertical = (
	binary: string,
	width: number,
	height: number,
	deltaRows: number,
): string =>
	gridToBinary(
		shiftEditorGridVertical(
			binaryToGrid(binary, width, height),
			deltaRows,
			height,
		),
	);

export const packBaselineEditorRow = (
	layoutHeight: number,
	packMetrics?: BitmapFontMetrics,
): number => resolveEditorFontMetrics(layoutHeight, packMetrics).baselineRow;

/** Decode editor binary using packMetrics.baselineRow (matches metric guides). */
export const packBinaryGridToGlyphRows = (
	binary: string,
	width: number,
	layoutHeight: number,
	packMetrics: BitmapFontMetrics,
): GlyphRowRun[] => {
	const baselineRow = packBaselineEditorRow(layoutHeight, packMetrics);
	const rows: GlyphRowRun[] = [];

	for (let row = 0; row < layoutHeight; row++) {
		const runs: [number, number][] = [];
		let runStart = -1;

		for (let x = 0; x < width; x++) {
			const filled = binary[row * width + x] === "1";
			if (filled && runStart < 0) runStart = x;
			if (!filled && runStart >= 0) {
				runs.push([runStart, x]);
				runStart = -1;
			}
		}

		if (runStart >= 0) runs.push([runStart, width]);
		if (runs.length === 0) continue;

		rows.push({
			y: baselineRow - row,
			runs,
		});
	}

	return rows;
};

/** Render v2 row runs into editor binary using packMetrics.baselineRow. */
export const editorGlyphToPackBinary = (
	glyph: EditorGlyph,
	packMetrics: BitmapFontMetrics,
	layoutHeight: number,
	rowStride: number,
): string => {
	const baselineRow = packBaselineEditorRow(layoutHeight, packMetrics);
	const cells = Array.from({ length: layoutHeight * rowStride }, () => "0");

	for (const { y, runs } of glyph.rows) {
		const row = baselineRow - y;
		if (row < 0 || row >= layoutHeight) continue;

		for (const [startX, endX] of runs) {
			for (let x = startX; x < endX; x++) {
				if (x < 0 || x >= rowStride) continue;
				cells[row * rowStride + x] = "1";
			}
		}
	}

	return cells.join("");
};

export const packBinaryToEditorGlyph = (
	binary: string,
	width: number,
	layoutHeight: number,
	packMetrics: BitmapFontMetrics,
	advance = width,
): EditorGlyph => ({
	rows: packBinaryGridToGlyphRows(binary, width, layoutHeight, packMetrics),
	width,
	advance,
});

export const buildBitmapCacheFromPackMetrics = (
	glyphs: Map<number, EditorGlyph>,
	packMetrics: BitmapFontMetrics,
	layoutHeight: number,
	gridSize: string,
	glyphMeta?: Map<number, { width?: number; advance?: number }>,
): Map<number, string> => {
	const cache = new Map<number, string>();
	for (const [charCode, glyph] of glyphs) {
		const rowStride = getGlyphBitmapStride(gridSize, charCode, glyphMeta);
		cache.set(
			charCode,
			editorGlyphToPackBinary(glyph, packMetrics, layoutHeight, rowStride),
		);
	}
	return cache;
};

export const resizeEditorGrid = (
	grid: number[][],
	newWidth: number,
	newHeight: number,
): number[][] => {
	const newGrid = Array.from({ length: newHeight }, () =>
		Array.from({ length: newWidth }, () => 0),
	);

	for (let y = 0; y < Math.min(newHeight, grid.length); y++) {
		const oldRow = grid[y] ?? [];
		for (let x = 0; x < Math.min(newWidth, oldRow.length); x++) {
			newGrid[y][x] = oldRow[x] ?? 0;
		}
	}

	return newGrid;
};

/** Clip run-length rows when glyph width shrinks; wider rows stay unchanged. */
export const resizeGlyphRows = (
	rows: GlyphRowRun[],
	newWidth: number,
): GlyphRowRun[] =>
	rows
		.map(({ y, runs }) => ({
			y,
			runs: runs
				.map(
					([start, end]) =>
						[start, Math.min(end, newWidth)] as [number, number],
				)
				.filter(([start, end]) => start < end && start < newWidth),
		}))
		.filter((row) => row.runs.length > 0);

/** Shift v2 row y values when the editor baseline row moves but canvas ink stays put. */
export const shiftEditorGlyphRowsY = (
	glyph: EditorGlyph,
	deltaRows: number,
): EditorGlyph => {
	if (deltaRows === 0) return glyph;
	return {
		...glyph,
		rows: glyph.rows.map(({ y, runs }) => ({
			y: y + deltaRows,
			runs,
		})),
	};
};

export const computeGlyphBoundsFromRows = (
	rows: GlyphRowRun[],
	width: number,
): GlyphBounds => {
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const { y, runs } of rows) {
		for (const [start, end] of runs) {
			if (end <= start) continue;
			minX = Math.min(minX, start);
			maxX = Math.max(maxX, end - 1);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	if (!Number.isFinite(minX)) {
		return { minX: 0, maxX: width, minY: 0, maxY: 0 };
	}

	return { minX, maxX: maxX + 1, minY, maxY };
};

export const editorGlyphToBinary = (
	glyph: EditorGlyph,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
): string =>
	v2GlyphToEditorBinary(
		{
			charCode: 0,
			char: "",
			width: glyph.width,
			advance: glyph.advance,
			leftBearing: 0,
			bounds: computeGlyphBoundsFromRows(glyph.rows, glyph.width),
			rows: glyph.rows,
		},
		metrics,
		gridHeight,
	);

export const binaryToEditorGlyph = (
	binary: string,
	width: number,
	layoutHeight: number,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
	advance = width,
): EditorGlyph => ({
	rows: binaryGridToGlyphRows(binary, width, layoutHeight, metrics, gridHeight),
	width,
	advance,
});

export const glyphRowsToSvgPath = (
	rows: GlyphRowRun[],
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
): string => {
	const parts: string[] = [];

	for (const { y, runs } of rows) {
		const row = v2YToEditorRow(y, metrics, gridHeight);
		for (const [start, end] of runs) {
			for (let x = start; x < end; x++) {
				parts.push(`M ${x} ${row} h 1 v 1 h -1 z`);
			}
		}
	}

	return parts.join(" ");
};

export const buildBitmapCacheFromGlyphs = (
	glyphs: Map<number, EditorGlyph>,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
): Map<number, string> => {
	const cache = new Map<number, string>();
	for (const [charCode, glyph] of glyphs) {
		cache.set(charCode, editorGlyphToBinary(glyph, metrics, gridHeight));
	}
	return cache;
};

export const editorGlyphToGlyph = (
	charCode: number,
	editorGlyph: EditorGlyph,
): Glyph => {
	const char = String.fromCharCode(charCode);
	return {
		charCode,
		char,
		width: editorGlyph.width,
		advance: editorGlyph.advance,
		leftBearing: 0,
		bounds: computeGlyphBoundsFromRows(editorGlyph.rows, editorGlyph.width),
		rows: editorGlyph.rows,
	};
};

/** Build v2 glyph map for sentence preview from the live editor store. */
export const buildPreviewGlyphsFromEditorStore = (
	store: Map<number, EditorGlyph> | undefined,
	metrics: NewBitmapFontMetrics,
	gridHeight: number,
	selectedGridSize: string,
	glyphMeta?: Map<number, { width?: number; advance?: number }>,
	liveEdit?: {
		charCode: number;
		binary: string;
	},
	packMetrics?: BitmapFontMetrics,
): Record<string, Glyph> => {
	const glyphs: Record<string, Glyph> = {};
	if (!store) return glyphs;

	const cellHeight = getV2LayoutHeight(metrics, gridHeight);

	for (const [charCode, editorGlyph] of store) {
		if (editorGlyph.rows.length === 0) continue;
		const glyph = editorGlyphToGlyph(charCode, editorGlyph);
		glyphs[glyph.char] = glyph;
	}

	if (liveEdit?.binary) {
		const { charCode, binary } = liveEdit;
		const char = String.fromCharCode(charCode);
		const existing = glyphs[char];
		const meta = glyphMeta?.get(charCode);
		const rowWidth = getEffectiveGlyphWidth(
			selectedGridSize,
			charCode,
			glyphMeta,
		);
		const rows = packMetrics
			? packBinaryGridToGlyphRows(binary, rowWidth, cellHeight, packMetrics)
			: binaryGridToGlyphRows(
					binary,
					rowWidth,
					cellHeight,
					metrics,
					gridHeight,
				);

		if (rows.length === 0 && !binary.includes("1")) {
			delete glyphs[char];
		} else {
			glyphs[char] = {
				charCode,
				char,
				width: meta?.width ?? existing?.width ?? rowWidth,
				advance: meta?.advance ?? existing?.advance ?? rowWidth,
				leftBearing: existing?.leftBearing ?? 0,
				bounds: computeGlyphBoundsFromRows(rows, rowWidth),
				rows,
			};
		}
	}

	return glyphs;
};

/** Rotate grid 90° within fixed bounds around the canvas center. */
export const rotateEditorGrid = (
	grid: number[][],
	width: number,
	height: number,
	direction: "cw" | "ccw",
): number[][] => {
	const result = Array.from({ length: height }, () =>
		Array.from({ length: width }, () => 0),
	);
	const cx = (width - 1) / 2;
	const cy = (height - 1) / 2;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (!grid[y]?.[x]) continue;

			const dx = x - cx;
			const dy = y - cy;
			const [rx, ry] =
				direction === "cw"
					? [Math.round(cx + dy), Math.round(cy - dx)]
					: [Math.round(cx - dy), Math.round(cy + dx)];

			if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
				result[ry][rx] = 1;
			}
		}
	}

	return result;
};
