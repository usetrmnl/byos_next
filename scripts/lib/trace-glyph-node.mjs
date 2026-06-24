import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { discoverGridForSource } from "./discover-pixel-grid.mjs";
import { BASIC_ASCII, rgbaToBinaryGrid } from "./trace-core.mjs";

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

function measureAdvance(family, renderSize, char) {
	const canvas = createCanvas(96, 64);
	const ctx = canvas.getContext("2d");
	ctx.font = `${renderSize}px "${family}"`;
	return Math.max(1, Math.ceil(ctx.measureText(char).width));
}

export function traceGlyphNode(source, char, grid, metrics) {
	const { family } = createTraceContext(source, grid);
	const traceMode = resolveTraceMode(source, grid);
	const inkDetection = resolveInkDetection(source, grid);
	const renderSize = grid.renderSize ?? source.preloadSize ?? grid.height;
	const dynamicWidth = grid.dynamicWidth ?? source.dynamicWidth ?? false;
	const cellHeight = metrics?.cellHeight ?? grid.height;
	const advance = measureAdvance(family, renderSize, char);
	const cellWidth = dynamicWidth ? advance : (grid.width ?? metrics?.cellWidth ?? advance);

	if (char === " ") {
		return {
			binary: "0".repeat(cellWidth * cellHeight),
			width: cellWidth,
			advance,
			height: cellHeight,
		};
	}

	const canvasWidth =
		traceMode === "pixelSnap" ? cellWidth : Math.max(cellWidth, renderSize + 2);
	const canvasHeight =
		traceMode === "pixelSnap" ? cellHeight : Math.max(cellHeight, renderSize + 2);

	const canvas = createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	ctx.fillStyle = "#000000";
	ctx.font = `${renderSize}px "${family}"`;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	ctx.imageSmoothingEnabled = false;
	ctx.fillText(char, 0, 0);

	const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
	const binary = rgbaToBinaryGrid(imageData.data, canvasWidth, canvasHeight, {
		targetWidth: cellWidth,
		targetHeight: cellHeight,
		mode: traceMode,
		inkDetection,
	});

	return {
		binary,
		width: cellWidth,
		advance,
		height: cellHeight,
	};
}

export function generateBitmapFontJson(source) {
	const metrics = source.discoverGrid ? discoverGridForSource(source, root) : null;
	const fonts = [];

	for (const grid of source.bitmapGrids) {
		const characters = [];
		const dynamicWidth = grid.dynamicWidth ?? source.dynamicWidth ?? false;
		const cellHeight = metrics?.cellHeight ?? grid.height;
		const cellWidth = dynamicWidth
			? 0
			: (metrics?.cellWidth ?? grid.width);

		for (const charCode of BASIC_ASCII) {
			const char = String.fromCharCode(charCode);
			const traced = traceGlyphNode(
				source,
				char,
				{ ...grid, height: cellHeight, width: grid.width ?? metrics?.cellWidth },
				metrics,
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
			height: cellHeight,
			characters,
		});
	}

	const gridDescriptions = source.bitmapGrids
		.map((grid) => {
			const h = metrics?.cellHeight ?? grid.height;
			const w = dynamicWidthLabel(source, grid, metrics);
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
			...(metrics ? { metrics } : {}),
		},
		fonts,
	};
}

function dynamicWidthLabel(source, grid, metrics) {
	const dynamicWidth = grid.dynamicWidth ?? source.dynamicWidth ?? false;
	if (dynamicWidth) return "dynamic";
	return String(metrics?.cellWidth ?? grid.width);
}

export { discoverGridForSource } from "./discover-pixel-grid.mjs";
