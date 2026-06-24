import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

const DEFAULT_PROBES = "WgAyjpxQ";
const CAP_CHARS = /[A-Z]/;
const DESC_CHARS = /[gjpqy]/;
const X_HEIGHT_CHARS = /[acemnorsuvx]/;

function gcd(a, b) {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y) {
		[x, y] = [y, x % y];
	}
	return x || 1;
}

function gcdList(values) {
	return values.reduce((acc, value) => gcd(acc, value), values[0] ?? 1);
}

function isInk(r, g, b, inkDetection) {
	if (inkDetection === "nonWhite") return Math.min(r, g, b) < 240;
	return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function renderGlyphCanvas(family, renderSize, char, canvasWidth, canvasHeight) {
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
	return { canvas, ctx };
}

function measureGlyph(family, renderSize, char, inkDetection) {
	const canvasWidth = 96;
	const canvasHeight = 64;
	const { canvas, ctx } = renderGlyphCanvas(
		family,
		renderSize,
		char,
		canvasWidth,
		canvasHeight,
	);
	const pixels = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

	let minX = canvasWidth;
	let minY = canvasHeight;
	let maxX = -1;
	let maxY = -1;
	const inkCoords = [];

	for (let y = 0; y < canvasHeight; y++) {
		for (let x = 0; x < canvasWidth; x++) {
			const i = (y * canvasWidth + x) * 4;
			if (!isInk(pixels[i], pixels[i + 1], pixels[i + 2], inkDetection)) {
				continue;
			}
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
			inkCoords.push([x, y]);
		}
	}

	if (maxX < minX || maxY < minY) {
		return {
			inkCoords,
			bounds: null,
			advance: Math.max(1, Math.ceil(ctx.measureText(char).width)),
		};
	}

	return {
		inkCoords,
		bounds: { minX, minY, maxX, maxY },
		advance: Math.max(1, Math.ceil(ctx.measureText(char).width)),
	};
}

function discoverPixelUnit(inkCoords) {
	const xs = [...new Set(inkCoords.map(([x]) => x))].sort((a, b) => a - b);
	const ys = [...new Set(inkCoords.map(([, y]) => y))].sort((a, b) => a - b);

	const xDiffs = [];
	const yDiffs = [];
	for (let i = 1; i < xs.length; i++) {
		const diff = xs[i] - xs[i - 1];
		if (diff > 0) xDiffs.push(diff);
	}
	for (let i = 1; i < ys.length; i++) {
		const diff = ys[i] - ys[i - 1];
		if (diff > 0) yDiffs.push(diff);
	}

	return {
		pixelUnitX: xDiffs.length ? gcdList(xDiffs) : 1,
		pixelUnitY: yDiffs.length ? gcdList(yDiffs) : 1,
	};
}

/**
 * Benchmark probe glyphs to discover cell height, baseline, line rhythm, and pixel unit.
 */
export function discoverPixelGrid({
	fontPath,
	family,
	renderSize,
	probeChars = DEFAULT_PROBES,
	inkDetection = "luminance",
	descenderRatio = 152 / 722,
}) {
	GlobalFonts.registerFromPath(fontPath, family);

	const probes = [...new Set(probeChars.split(""))];
	const allInk = [];
	let capMinY = Number.POSITIVE_INFINITY;
	let descMaxY = Number.NEGATIVE_INFINITY;
	let xHeightMinY = Number.POSITIVE_INFINITY;
	let xHeightMaxY = Number.NEGATIVE_INFINITY;
	let maxAdvance = 1;

	for (const char of probes) {
		const measured = measureGlyph(family, renderSize, char, inkDetection);
		maxAdvance = Math.max(maxAdvance, measured.advance);
		allInk.push(...measured.inkCoords);
		if (!measured.bounds) continue;

		const { minY, maxY } = measured.bounds;
		if (CAP_CHARS.test(char)) capMinY = Math.min(capMinY, minY);
		if (DESC_CHARS.test(char)) descMaxY = Math.max(descMaxY, maxY);
		if (X_HEIGHT_CHARS.test(char)) {
			xHeightMinY = Math.min(xHeightMinY, minY);
			xHeightMaxY = Math.max(xHeightMaxY, maxY);
		}
	}

	const pixelUnits = discoverPixelUnit(allInk);
	const descenderDepthFromRatio = Math.max(
		0,
		Math.round(renderSize * descenderRatio),
	);
	const measuredDescDepth =
		descMaxY > xHeightMaxY ? descMaxY - xHeightMaxY : 0;
	const descenderDepth = Math.max(descenderDepthFromRatio, measuredDescDepth);
	const cellHeight = renderSize + descenderDepth;
	const baselineRow =
		Number.isFinite(xHeightMaxY) && xHeightMaxY >= 0
			? xHeightMaxY
			: renderSize - 1;
	const capTop = Number.isFinite(capMinY) ? capMinY : 0;
	const xHeight = Number.isFinite(xHeightMaxY)
		? xHeightMaxY - xHeightMinY + 1
		: renderSize;
	const lineHeight = xHeight;

	return {
		renderSize,
		cellHeight,
		cellWidth: maxAdvance,
		capTop,
		baselineRow,
		descenderDepth,
		xHeight,
		lineHeight,
		pixelUnit: Math.max(1, pixelUnits.pixelUnitX, pixelUnits.pixelUnitY),
		pixelUnitX: pixelUnits.pixelUnitX,
		pixelUnitY: pixelUnits.pixelUnitY,
		dynamicWidth: true,
	};
}

export function ensureDiscoveredFamily(source, root) {
	const fontFile = source.file;
	const fontPath = join(root, "public", "fonts", fontFile);
	const family = `trace-${source.id}-${fontFile}`;
	return { fontPath, family };
}

export function discoverGridForSource(source, root) {
	const { fontPath, family } = ensureDiscoveredFamily(source, root);
	const renderSize = source.preloadSize ?? source.bitmapGrids?.[0]?.renderSize ?? 19;
	return discoverPixelGrid({
		fontPath,
		family,
		renderSize,
		probeChars: source.benchmarkProbes ?? DEFAULT_PROBES,
		inkDetection: source.inkDetection ?? "luminance",
	});
}
