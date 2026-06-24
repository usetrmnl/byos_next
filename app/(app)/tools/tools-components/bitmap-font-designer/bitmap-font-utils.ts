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
};

export const resolveEditorFontMetrics = (
	height: number,
	packMetrics?: {
		cellHeight?: number;
		capTop?: number;
		baselineRow?: number;
		descenderDepth?: number;
		xHeight?: number;
		lineHeight?: number;
	},
): EditorFontMetrics => {
	const cellHeight = packMetrics?.cellHeight ?? height;
	const baselineRow = packMetrics?.baselineRow ?? height - 1;
	const capTop = packMetrics?.capTop ?? 0;
	const xHeightY =
		packMetrics?.xHeight ?? Math.max(1, Math.floor(height * 0.6));
	const descenderDepth = packMetrics?.descenderDepth ?? 0;
	const minY = baselineRow - (cellHeight - 1);
	const maxY = baselineRow;

	return {
		baselineRow,
		capTop,
		xHeightRow: baselineRow - xHeightY,
		xHeightY,
		capHeightY: baselineRow - capTop,
		descenderDepth,
		descenderRow: Math.min(height - 1, baselineRow + descenderDepth),
		descenderY: -descenderDepth,
		minY,
		maxY,
		minYRow: Math.min(height - 1, Math.max(0, baselineRow - minY)),
		maxYRow: Math.max(0, baselineRow - maxY),
		cellHeight,
		lineHeight: packMetrics?.lineHeight ?? height,
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
