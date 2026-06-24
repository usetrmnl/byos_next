import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
	discoverGridForGrid,
	discoverGridForSource,
} from "./discover-pixel-grid.mjs";
import { BASIC_ASCII, directCropToGrid, findInkBounds, measureHorizontalCenterOffset, rgbaToBinaryGrid, sampleToBinaryGrid } from "./trace-core.mjs";
import {
	legacyMetricsFromTraceLayout,
	resolveMetricFontSize,
	resolveTraceLayout,
} from "./trace-layout.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const registeredFonts = new Set();

function binaryToBase64(binary) {
	const bytes = [];
	for (let i = 0; i < binary.length; i += 8) {
		const chunk = binary.slice(i, Math.min(i + 8, binary.length));
		const paddedChunk = chunk.padEnd(8, "0");
		bytes.push(Number.parseInt(paddedChunk, 2));
	}
	return Buffer.from(bytes).toString("base64");
}

function ensureFontRegistered(fontPath, family) {
	if (registeredFonts.has(family)) return;
	GlobalFonts.registerFromPath(fontPath, family);
	registeredFonts.add(family);
}

function resolveTraceMode(source, grid) {
	if (grid.traceMode) return grid.traceMode;
	if (source.traceMode) return source.traceMode;
	if (grid.pixelSnap ?? source.pixelSnap) return "pixelSnap";
	return "fit";
}

function resolveInkDetection(source, grid) {
	return grid.inkDetection ?? source.inkDetection ?? "luminance";
}

function createTraceContext(source, grid) {
	const fontFile = grid.file ?? source.file;
	const fontPath = join(root, "public", "fonts", fontFile);
	const family = `trace-${source.id}-${fontFile}`;
	ensureFontRegistered(fontPath, family);
	return { fontPath, family, fontFile };
}

function shouldDiscoverGrid(source, grid) {
	return grid.discoverGrid ?? source.discoverGrid ?? false;
}

/** Convert discovered probe metrics into legacy cell metrics for v2 conversion. */
export function discoveredToLegacyMetrics(discovered, dynamicWidth) {
	return {
		cellHeight: discovered.cellHeight,
		capTop: discovered.capTop,
		baselineRow: discovered.baselineRow,
		descenderDepth: discovered.descenderDepth,
		xHeight: discovered.xHeight,
		lineHeight: discovered.lineHeight ?? discovered.cellHeight,
		pixelUnitX: discovered.pixelUnitX ?? discovered.pixelUnit ?? 1,
		pixelUnitY: discovered.pixelUnitY ?? discovered.pixelUnit ?? 1,
		dynamicWidth: dynamicWidth ?? discovered.dynamicWidth ?? false,
	};
}

/** Default per-face metrics from grid dimensions when discovery is off. */
export function defaultMetricsForFace(face, dynamicWidth = false) {
	return {
		cellHeight: face.height,
		capTop: 0,
		baselineRow: face.height - 1,
		descenderDepth: 0,
		xHeight: Math.max(1, Math.floor(face.height * 0.6)),
		lineHeight: face.height,
		pixelUnitX: 1,
		pixelUnitY: 1,
		dynamicWidth,
	};
}

function measureAdvance(family, renderSize, char) {
	const canvas = createCanvas(96, 64);
	const ctx = canvas.getContext("2d");
	ctx.font = `${renderSize}px "${family}"`;
	return Math.max(1, Math.ceil(ctx.measureText(char).width));
}

function measureInkWidth(binary, rowWidth) {
	if (rowWidth <= 0) return 0;
	let maxX = -1;
	for (let i = 0; i < binary.length; i++) {
		if (binary[i] !== "1") continue;
		maxX = Math.max(maxX, i % rowWidth);
	}
	return maxX >= 0 ? maxX + 1 : 0;
}

function renderGlyphRaster({
	family,
	fontSize,
	char,
	canvasWidth,
	canvasHeight,
	baselineRow,
	drawX,
}) {
	const canvas = createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	ctx.fillStyle = "#000000";
	ctx.font = `${fontSize}px "${family}"`;
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	ctx.imageSmoothingEnabled = false;
	ctx.fillText(char, drawX, baselineRow);

	return ctx.getImageData(0, 0, canvasWidth, canvasHeight);
}

export function traceGlyphNode(source, char, grid, metrics) {
	const { family } = createTraceContext(source, grid);
	const traceMode = resolveTraceMode(source, grid);
	const inkDetection = resolveInkDetection(source, grid);
	const layout = resolveTraceLayout(grid);
	const { traceHeight, baselineRow, gridHeight } = layout;
	const metricAnchored = Boolean(grid.v2Metrics);
	const requestedRenderSize =
		grid.renderSize ?? source.preloadSize ?? gridHeight;
	const renderSize = metricAnchored
		? resolveMetricFontSize(grid, layout)
		: requestedRenderSize;
	const dynamicWidth =
		grid.dynamicWidth ?? source.dynamicWidth ?? false;
	const cellWidth = dynamicWidth ? 0 : (grid.width ?? metrics?.cellWidth);
	const centerHorizontally =
		grid.centerHorizontally ?? source.centerHorizontally ?? !dynamicWidth;
	const advance = dynamicWidth
		? measureAdvance(family, renderSize, char)
		: cellWidth;

	if (char === " ") {
		const slotWidth = dynamicWidth ? advance : cellWidth;
		return {
			binary: "0".repeat(slotWidth * traceHeight),
			width: slotWidth,
			advance,
			height: traceHeight,
		};
	}

	const canvasWidth =
		traceMode === "pixelSnap" || traceMode === "metricSnap"
			? Math.max(cellWidth, dynamicWidth ? advance : cellWidth)
			: Math.max(cellWidth, renderSize + 2);
	const canvasHeight = metricAnchored
		? traceHeight
		: traceMode === "pixelSnap" || traceMode === "metricSnap"
			? Math.max(traceHeight, renderSize)
			: Math.max(traceHeight, renderSize + 2);
	const targetWidth = dynamicWidth ? canvasWidth : cellWidth;

	let drawX = 0;
	if (metricAnchored && centerHorizontally && !dynamicWidth && cellWidth > 0) {
		const probe = renderGlyphRaster({
			family,
			fontSize: renderSize,
			char,
			canvasWidth,
			canvasHeight,
			baselineRow,
			drawX: 0,
		});
		drawX = measureHorizontalCenterOffset(
			probe.data,
			canvasWidth,
			canvasHeight,
			cellWidth,
			128,
			inkDetection,
		);
	}

	const imageData = metricAnchored
		? renderGlyphRaster({
				family,
				fontSize: renderSize,
				char,
				canvasWidth,
				canvasHeight,
				baselineRow,
				drawX,
			})
		: (() => {
				const canvas = createCanvas(canvasWidth, canvasHeight);
				const ctx = canvas.getContext("2d");
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, canvasWidth, canvasHeight);
				ctx.fillStyle = "#000000";
				ctx.font = `${renderSize}px "${family}"`;
				ctx.textBaseline = "alphabetic";
				ctx.textAlign = "left";
				ctx.imageSmoothingEnabled = false;
				ctx.fillText(char, 0, baselineRow);
				return ctx.getImageData(0, 0, canvasWidth, canvasHeight);
			})();

	const needsVerticalScale =
		!metricAnchored &&
		(traceMode === "pixelSnap" || traceMode === "metricSnap") &&
		canvasHeight > traceHeight;
	let binary;

	if (metricAnchored) {
		binary = directCropToGrid(
			imageData.data,
			canvasWidth,
			canvasHeight,
			targetWidth,
			traceHeight,
			128,
			inkDetection,
		);
	} else if (needsVerticalScale) {
		const bounds = findInkBounds(
			imageData.data,
			canvasWidth,
			canvasHeight,
			128,
			traceMode,
			inkDetection,
		);
		binary = bounds
			? sampleToBinaryGrid(
					imageData.data,
					canvasWidth,
					canvasHeight,
					bounds,
					targetWidth,
					traceHeight,
					128,
					traceMode,
					inkDetection,
				)
			: "0".repeat(targetWidth * traceHeight);
	} else {
		binary = rgbaToBinaryGrid(imageData.data, canvasWidth, canvasHeight, {
			targetWidth,
			targetHeight: traceHeight,
			mode: traceMode,
			inkDetection,
			centerHorizontally,
		});
	}

	const inkWidth = measureInkWidth(binary, targetWidth);

	return {
		binary,
		width: dynamicWidth ? Math.max(inkWidth, 1) : cellWidth,
		advance,
		height: traceHeight,
	};
}

export function generateBitmapFontJson(source) {
	const fonts = [];
	let packMetrics = null;

	for (const grid of source.bitmapGrids) {
		const metrics = shouldDiscoverGrid(source, grid)
			? discoverGridForGrid(source, grid, root)
			: null;

		const dynamicWidth =
			grid.dynamicWidth ?? source.dynamicWidth ?? false;
		const layout = resolveTraceLayout(grid);
		const cellHeight = layout.traceHeight;
		const cellWidth = dynamicWidth ? 0 : (grid.width ?? metrics?.cellWidth);

		const faceLegacyMetrics = metrics
			? discoveredToLegacyMetrics(metrics, dynamicWidth)
			: grid.v2Metrics
				? legacyMetricsFromTraceLayout(layout, dynamicWidth)
				: defaultMetricsForFace(
						{ width: cellWidth, height: grid.height },
						dynamicWidth,
					);

		if (!packMetrics) packMetrics = faceLegacyMetrics;

		const characters = [];

		for (const charCode of BASIC_ASCII) {
			const char = String.fromCharCode(charCode);
			const traced = traceGlyphNode(
				source,
				char,
				{
					...grid,
					height: grid.height,
					width: cellWidth,
				},
				metrics ?? faceLegacyMetrics,
			);

			if (charCode !== 32 && !traced.binary.includes("1")) continue;

			characters.push({
				charCode,
				char,
				data: binaryToBase64(traced.binary),
				...(dynamicWidth
					? { width: traced.width, advance: traced.advance }
					: {}),
			});
		}

		fonts.push({
			width: cellWidth,
			height: grid.height,
			characters,
			metrics: faceLegacyMetrics,
		});
	}

	const gridDescriptions = source.bitmapGrids
		.map((grid, index) => {
			const face = fonts[index];
			const h = face?.height ?? grid.height;
			const w = dynamicWidthLabel(source, grid, face);
			return `${w}×${h}`;
		})
		.join(", ");

	return {
		metadata: {
			name: source.label,
			creator: "generate-bitmap-fonts",
			createdAt: new Date().toISOString(),
			version: "1.0",
			description: `Generated from ${source.label} (${gridDescriptions}) — ${source.license}`,
			sourceId: source.id,
			sourceFiles: [
				...new Set(
					source.bitmapGrids.map((grid) => grid.file ?? source.file),
				),
			],
			metrics: packMetrics,
		},
		fonts,
	};
}

function dynamicWidthLabel(source, grid, face) {
	const dynamicWidth =
		grid.dynamicWidth ?? source.dynamicWidth ?? face?.metrics?.dynamicWidth ?? false;
	if (dynamicWidth) return "dynamic";
	return String(face?.width ?? grid.width);
}

export { discoverGridForSource, discoverGridForGrid } from "./discover-pixel-grid.mjs";
