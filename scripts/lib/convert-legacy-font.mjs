import { decodeCellData } from "./decode-cell-data.mjs";

export function convertLegacyMetrics(metrics) {
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
		pixelUnitX,
		pixelUnitY,
		dynamicWidth,
	};
}

function rowToRuns(row) {
	const runs = [];
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

function emptyBounds() {
	return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
}

export function convertLegacyGlyph(character, face, metrics) {
	const cellHeight = face.height;
	const baselineRow = metrics.baselineRow;
	const glyphWidth = character.width ?? (face.width > 0 ? face.width : 1);
	const grid = decodeCellData(character.data, glyphWidth, cellHeight);

	const rows = [];
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

function glyphKey(character, useCharCodeKeys) {
	if (useCharCodeKeys) return String(character.charCode);
	return character.char.length > 0 ? character.char : String(character.charCode);
}

export function convertLegacyFontFace(face, metrics, options = {}) {
	const glyphs = {};
	const useCharCodeKeys = options.useCharCodeKeys ?? false;

	for (const character of face.characters) {
		const key = glyphKey(character, useCharCodeKeys);
		glyphs[key] = convertLegacyGlyph(character, face, metrics);
	}

	return glyphs;
}

export function convertLegacyBitmapFont(pack, options = {}) {
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

function gridSizeKey(width, height) {
	return width > 0 ? `${width}x${height}` : `0x${height}`;
}

export function convertLegacyPackToV2(pack, options = {}) {
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

		return {
			metadata,
			glyphs: convertLegacyFontFace(face, legacyMetrics, options),
		};
	}

	const faces = {};
	for (const face of pack.fonts) {
		const key = gridSizeKey(face.width, face.height);
		faces[key] = {
			glyphs: convertLegacyFontFace(face, legacyMetrics, options),
		};
	}

	return { metadata, faces };
}
