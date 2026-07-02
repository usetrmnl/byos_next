#!/usr/bin/env node
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { traceGlyphNode } from "./lib/trace-glyph-node.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SAMPLE_CHARS = ["H", "e", "x", "i", "!", "g", "p", "q", "y", "l", "m"];
const X_HEIGHT_CHARS = Array.from("acemnorsuvxz");
const CAP_CHARS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
const DESCENDER_CHARS = Array.from("gjpqy");

function loadPack(relPath) {
	return JSON.parse(readFileSync(join(root, relPath), "utf8"));
}

function readUInt16(buffer, offset) {
	return buffer.readUInt16BE(offset);
}

function readInt16(buffer, offset) {
	return buffer.readInt16BE(offset);
}

function readUInt32(buffer, offset) {
	return buffer.readUInt32BE(offset);
}

function tableDirectory(buffer) {
	const tableCount = readUInt16(buffer, 4);
	const tables = {};
	for (let index = 0; index < tableCount; index++) {
		const offset = 12 + index * 16;
		const tag = buffer.toString("ascii", offset, offset + 4);
		tables[tag] = {
			offset: readUInt32(buffer, offset + 8),
			length: readUInt32(buffer, offset + 12),
		};
	}
	return tables;
}

function parseFontTables(fontPath) {
	const buffer = readFileSync(fontPath);
	const tables = tableDirectory(buffer);
	const head = tables.head;
	const hhea = tables.hhea;
	const os2 = tables["OS/2"];
	const parsed = {
		tables: Object.keys(tables).sort(),
	};

	if (head) {
		const offset = head.offset;
		parsed.unitsPerEm = readUInt16(buffer, offset + 18);
		parsed.fontBounds = {
			xMin: readInt16(buffer, offset + 36),
			yMin: readInt16(buffer, offset + 38),
			xMax: readInt16(buffer, offset + 40),
			yMax: readInt16(buffer, offset + 42),
		};
	}

	if (hhea) {
		const offset = hhea.offset;
		parsed.hhea = {
			ascender: readInt16(buffer, offset + 4),
			descender: readInt16(buffer, offset + 6),
			lineGap: readInt16(buffer, offset + 8),
		};
	}

	if (os2) {
		const offset = os2.offset;
		const version = readUInt16(buffer, offset);
		parsed.os2 = {
			version,
			xAvgCharWidth: readInt16(buffer, offset + 2),
			usWeightClass: readUInt16(buffer, offset + 4),
			sTypoAscender: readInt16(buffer, offset + 68),
			sTypoDescender: readInt16(buffer, offset + 70),
			sTypoLineGap: readInt16(buffer, offset + 72),
			usWinAscent: readUInt16(buffer, offset + 74),
			usWinDescent: readUInt16(buffer, offset + 76),
		};
		if (version >= 2 && os2.length >= 90) {
			parsed.os2.sxHeight = readInt16(buffer, offset + 86);
			parsed.os2.sCapHeight = readInt16(buffer, offset + 88);
		}
	}

	return parsed;
}

function gridKey(grid) {
	return grid.width > 0 ? `${grid.width}x${grid.height}` : `0x${grid.height}`;
}

function resolveTraceHeight(grid) {
	const metrics = grid.v2Metrics;
	if (!metrics) return grid.height;
	const metricHeight = metrics.maxY - metrics.minY + 1;
	return Math.max(
		grid.height + Math.max(0, -metrics.minY),
		metricHeight,
		grid.height,
	);
}

function getFace(pack, key) {
	if (pack.faces?.[key]) return { gridSize: key, ...pack.faces[key] };
	if (pack.glyphs && key === "__root__") {
		return {
			gridSize: key,
			metrics: pack.metadata.metrics,
			glyphs: pack.glyphs,
		};
	}
	return null;
}

function glyphFor(glyphs, char) {
	return glyphs[char] ?? glyphs[String(char.charCodeAt(0))] ?? null;
}

function sampleGlyphs(glyphs, chars = SAMPLE_CHARS) {
	const out = {};
	for (const char of chars) {
		const g = glyphFor(glyphs, char);
		out[char] = g?.bounds ?? null;
	}
	return out;
}

function getV2CellHeight(metrics) {
	return metrics.maxY - metrics.minY + 1;
}

function getV2LayoutHeight(metrics, gridHeight) {
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

function getV2BaselineEditorRow(metrics, gridHeight) {
	const metricHeight = getV2CellHeight(metrics);
	const metricBaseline = metricHeight - 1 + metrics.minY;
	if (
		gridHeight != null &&
		gridHeight > 0 &&
		(gridHeight < metricHeight || metrics.minY < 0)
	) {
		return gridHeight - 1;
	}
	return metricBaseline;
}

function v2GlyphToEditorBinary(glyph, metrics, gridHeight) {
	const rowStride = metrics.dynamicWidth
		? Math.max(glyph.advance ?? 0, glyph.width ?? 0, 1)
		: Math.max(glyph.width ?? 0, glyph.advance ?? 0, 1);
	const layoutHeight = getV2LayoutHeight(metrics, gridHeight);
	const baselineRow = getV2BaselineEditorRow(metrics, gridHeight);
	const cells = Array.from({ length: layoutHeight * rowStride }, () => "0");

	for (const { y, runs } of glyph.rows) {
		const row = baselineRow - y;
		if (row < 0 || row >= layoutHeight) continue;
		for (const [startX, endX] of runs) {
			for (let x = startX; x < endX; x++) {
				if (x >= 0 && x < rowStride) cells[row * rowStride + x] = "1";
			}
		}
	}

	return { binary: cells.join(""), width: rowStride, height: layoutHeight };
}

function binaryDiff(a, b) {
	const length = Math.max(a.length, b.length);
	let different = 0;
	for (let index = 0; index < length; index++) {
		if ((a[index] ?? "0") !== (b[index] ?? "0")) different++;
	}
	return different;
}

function columnInkCounts(binary, width, height) {
	const counts = Array.from({ length: width }, () => 0);
	for (let row = 0; row < height; row++) {
		for (let x = 0; x < width; x++) {
			if (binary[row * width + x] === "1") counts[x]++;
		}
	}
	return counts;
}

function uniqueFinite(values) {
	return [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
}

function auditGeneratedFace({ pack, source, grid }) {
	const key = gridKey(grid);
	const face = getFace(pack, key);
	if (!face) return { gridSize: key, error: "face not found" };

	const xHeightRows = uniqueFinite(
		X_HEIGHT_CHARS.map((char) => glyphFor(face.glyphs, char)?.bounds?.maxY),
	);
	const capHeightRows = uniqueFinite(
		CAP_CHARS.map((char) => glyphFor(face.glyphs, char)?.bounds?.maxY),
	);
	const descenderRows = uniqueFinite(
		DESCENDER_CHARS.map((char) => glyphFor(face.glyphs, char)?.bounds?.minY),
	);
	const outOfMetricBounds = SAMPLE_CHARS.flatMap((char) => {
		const glyph = glyphFor(face.glyphs, char);
		if (!glyph?.rows?.length) return [];
		if (
			glyph.bounds.minY < face.metrics.minY ||
			glyph.bounds.maxY > face.metrics.maxY
		) {
			return [{ char, bounds: glyph.bounds }];
		}
		return [];
	});
	const sourceDiffs = {};

	for (const char of SAMPLE_CHARS) {
		const glyph = glyphFor(face.glyphs, char);
		if (!glyph) {
			sourceDiffs[char] = { error: "missing generated glyph" };
			continue;
		}
		const sourceTrace = traceGlyphNode(
			source,
			char,
			{
				...grid,
				width: grid.width > 0 ? grid.width : 0,
				height: grid.height,
			},
			null,
		);
		const generated = v2GlyphToEditorBinary(glyph, face.metrics, grid.height);
		sourceDiffs[char] = {
			differentPixels: binaryDiff(sourceTrace.binary, generated.binary),
			source: {
				width: sourceTrace.width,
				advance: sourceTrace.advance,
				height: sourceTrace.height,
			},
			generated: {
				width: generated.width,
				advance: glyph.advance,
				height: generated.height,
			},
		};
	}

	const hGlyph = glyphFor(face.glyphs, "H");
	const lGlyph = glyphFor(face.glyphs, "l");
	const hBinary = hGlyph
		? v2GlyphToEditorBinary(hGlyph, face.metrics, grid.height)
		: null;
	const lBinary = lGlyph
		? v2GlyphToEditorBinary(lGlyph, face.metrics, grid.height)
		: null;

	return {
		gridSize: key,
		metrics: face.metrics,
		trace: {
			metricFontSize: grid.metricFontSize ?? grid.height,
			traceHeight: resolveTraceHeight(grid),
			baselineEditorRow: grid.height - 1,
			perGlyphBboxScale: false,
		},
		glyphBounds: sampleGlyphs(face.glyphs),
		xHeightRows,
		capHeightRows,
		descenderRows,
		metricAlignment: {
			xHeightGap: xHeightRows.map((row) => row - face.metrics.xHeightY),
			capHeightGap: capHeightRows.map((row) => row - face.metrics.capHeightY),
			descenderGap: descenderRows.map((row) => row - face.metrics.descenderY),
		},
		outOfMetricBounds,
		strokeSamples: {
			HColumnInkCounts: hBinary
				? columnInkCounts(hBinary.binary, hBinary.width, hBinary.height)
				: null,
			lColumnInkCounts: lBinary
				? columnInkCounts(lBinary.binary, lBinary.width, lBinary.height)
				: null,
		},
		sourceDiffs,
	};
}

function registerProbeFont(fontPath, family) {
	GlobalFonts.registerFromPath(fontPath, family);
}

function scanCanvasGlyph({
	family,
	fontSize,
	char,
	width,
	height,
	baselineRow,
	drawX = 0,
}) {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = "#000000";
	ctx.font = `${fontSize}px "${family}"`;
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	ctx.imageSmoothingEnabled = false;
	ctx.fillText(char, drawX, baselineRow);

	const data = ctx.getImageData(0, 0, width, height).data;
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			if (Math.min(data[index], data[index + 1], data[index + 2]) >= 240) {
				continue;
			}
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}

	if (maxX < minX) return null;
	return {
		minX,
		maxX,
		minY,
		maxY,
		v2MinY: baselineRow - maxY,
		v2MaxY: baselineRow - minY,
	};
}

function probeCanvasMetrics({ fontPath, family, sizes }) {
	registerProbeFont(fontPath, family);

	return sizes.map((fontSize) => {
		const baselineRow = 40;
		const glyphBounds = {};
		for (const char of SAMPLE_CHARS) {
			glyphBounds[char] = scanCanvasGlyph({
				family,
				fontSize,
				char,
				width: 96,
				height: 80,
				baselineRow,
				drawX: 10,
			});
		}
		const xHeightRows = uniqueFinite(
			X_HEIGHT_CHARS.map(
				(char) =>
					scanCanvasGlyph({
						family,
						fontSize,
						char,
						width: 96,
						height: 80,
						baselineRow,
						drawX: 10,
					})?.v2MaxY,
			),
		);
		const capHeightRows = uniqueFinite(
			CAP_CHARS.map(
				(char) =>
					scanCanvasGlyph({
						family,
						fontSize,
						char,
						width: 128,
						height: 80,
						baselineRow,
						drawX: 10,
					})?.v2MaxY,
			),
		);
		const descenderRows = uniqueFinite(
			DESCENDER_CHARS.map(
				(char) =>
					scanCanvasGlyph({
						family,
						fontSize,
						char,
						width: 96,
						height: 80,
						baselineRow,
						drawX: 10,
					})?.v2MinY,
			),
		);

		return {
			fontSize,
			glyphBounds,
			xHeightRows,
			capHeightRows,
			descenderRows,
		};
	});
}

function scaledFontMetrics(fontTables, fontSize) {
	const unitsPerEm = fontTables.unitsPerEm;
	if (!unitsPerEm) return null;

	const scale = (value) => Number(((value / unitsPerEm) * fontSize).toFixed(2));
	return {
		xHeight: fontTables.os2?.sxHeight ? scale(fontTables.os2.sxHeight) : null,
		capHeight: fontTables.os2?.sCapHeight
			? scale(fontTables.os2.sCapHeight)
			: null,
		hheaAscender: fontTables.hhea?.ascender
			? scale(fontTables.hhea.ascender)
			: null,
		hheaDescender: fontTables.hhea?.descender
			? scale(fontTables.hhea.descender)
			: null,
	};
}

function auditGeneva() {
	const manifest = loadPack("lib/font-sources.json");
	const source = manifest.sources.find((entry) => entry.id === "geneva");
	const pack = loadPack(source.generatedJson);

	return source.bitmapGrids.map((grid, index) => {
		const fontFile = grid.file ?? source.file;
		const fontPath = join(root, "public", "fonts", fontFile);
		const fontTables = parseFontTables(fontPath);
		const metricFontSize = grid.metricFontSize ?? grid.height;
		const candidateSizes = grid.height === 11 ? [9, 11, 16] : [12, 16, 20];

		return {
			sourceFile: fontFile,
			gridSize: gridKey(grid),
			fontTables,
			scaledConfiguredMetrics: scaledFontMetrics(fontTables, metricFontSize),
			canvasProbes: probeCanvasMetrics({
				fontPath,
				family: `audit-geneva-${index}-${fontFile}`,
				sizes: candidateSizes,
			}),
			generated: auditGeneratedFace({ pack, source, grid }),
		};
	});
}

console.log(JSON.stringify({ geneva: auditGeneva() }, null, 2));
