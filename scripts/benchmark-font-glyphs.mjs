#!/usr/bin/env node
/**
 * Benchmark traced bitmap glyphs against expected row patterns.
 *
 * Usage:
 *   node scripts/benchmark-font-glyphs.mjs
 *   node scripts/benchmark-font-glyphs.mjs --browser
 *   node scripts/benchmark-font-glyphs.mjs --source geneva
 */
import { readFileSync } from "fs";
import { createServer } from "http";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import {
	discoverGridForGrid,
} from "./lib/discover-pixel-grid.mjs";
import {
	defaultMetricsForFace,
	discoveredToLegacyMetrics,
	traceGlyphNode,
} from "./lib/trace-glyph-node.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const manifest = JSON.parse(
	readFileSync(join(root, "lib/font-sources.json"), "utf8"),
);
const fixtures = JSON.parse(
	readFileSync(join(root, "scripts/font-glyph-fixtures.json"), "utf8"),
);

const CHROME_PATHS = [
	process.env.CHROME_PATH,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);

function findChrome() {
	for (const path of CHROME_PATHS) {
		try {
			readFileSync(path);
			return path;
		} catch {
			continue;
		}
	}
	return null;
}

function compactRows(rows) {
	return rows.filter((row) => row.includes("1"));
}

function parseArgs(argv) {
	const args = { browser: false, source: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === "--browser") args.browser = true;
		if (argv[i] === "--source" && argv[i + 1]) args.source = argv[++i];
	}
	return args;
}

function binaryToRows(binary, width) {
	const height = Math.ceil(binary.length / width);
	const rows = [];
	for (let y = 0; y < height; y++) {
		rows.push(binary.slice(y * width, (y + 1) * width).padEnd(width, "0"));
	}
	return rows;
}

function trimRows(rows) {
	let top = 0;
	let bottom = rows.length - 1;
	while (top <= bottom && [...rows[top]].every((c) => c === "0")) top++;
	while (bottom >= top && [...rows[bottom]].every((c) => c === "0")) bottom--;
	return rows.slice(top, bottom + 1);
}

function alignRows(actualRows, expectedRows, align = "center") {
	const expectedWidth = Math.max(...expectedRows.map((row) => row.length));
	const actualWidth = Math.max(...actualRows.map((row) => row.length), 1);
	const width = Math.max(expectedWidth, actualWidth);

	const padRow = (row, rowAlign) => {
		if (row.length >= width) return row.slice(0, width);
		const pad = width - row.length;
		if (rowAlign === "left") return row + "0".repeat(pad);
		if (rowAlign === "right") return "0".repeat(pad) + row;
		const left = Math.floor(pad / 2);
		return "0".repeat(left) + row + "0".repeat(pad - left);
	};

	const paddedActual = actualRows.map((row) => padRow(row, align));
	const paddedExpected = expectedRows.map((row) => padRow(row, align));
	const rowCount = Math.max(paddedActual.length, paddedExpected.length);

	let matches = 0;
	let total = 0;
	const diffs = [];

	for (let i = 0; i < rowCount; i++) {
		const actual = paddedActual[i] ?? "0".repeat(width);
		const expected = paddedExpected[i] ?? "0".repeat(width);
		for (let x = 0; x < width; x++) {
			total++;
			if (actual[x] === expected[x]) matches++;
			else diffs.push({ row: i, x, actual: actual[x], expected: expected[x] });
		}
	}

	return {
		score: total > 0 ? matches / total : 0,
		diffs: diffs.slice(0, 12),
		actualRows: paddedActual,
		expectedRows: paddedExpected,
	};
}

function resolveFaceMetrics(source, grid, metrics) {
	if (metrics) return metrics;
	return defaultMetricsForFace(
		{
			width: grid.width ?? 0,
			height: grid.height ?? source.preloadSize ?? 8,
		},
		grid.dynamicWidth ?? source.dynamicWidth ?? false,
	);
}

function traceFixtureCase(source, testCase) {
	const grid = {
		...source.bitmapGrids[testCase.gridIndex ?? 0],
	};
	const discovered = (grid.discoverGrid ?? source.discoverGrid)
		? discoverGridForGrid(source, grid, root)
		: null;
	const metrics = discovered ?? resolveFaceMetrics(source, grid, null);
	const legacyMetrics = discovered
		? discoveredToLegacyMetrics(discovered)
		: metrics;

	const traced = traceGlyphNode(
		source,
		testCase.char,
		{
			...grid,
			height: discovered?.cellHeight ?? grid.height ?? legacyMetrics.cellHeight,
			width: grid.width ?? discovered?.cellWidth,
		},
		discovered ?? legacyMetrics,
	);

	return {
		rows: trimRows(binaryToRows(traced.binary, traced.width)),
		width: traced.width,
		height: traced.height,
	};
}

async function traceWithBrowser(testCase, source) {
	const chromePath = findChrome();
	if (!chromePath) {
		throw new Error("Chrome not found for --browser benchmark");
	}

	const grid = source.bitmapGrids[testCase.gridIndex ?? 0];
	const fontFile = grid.file ?? source.file;
	const renderSize = grid.renderSize ?? source.preloadSize ?? 16;
	const htmlPath = join(root, "scripts/font-glyph-benchmark.html");
	const fontUrl = `/fonts/${fontFile}`;

	const server = createServer(async (req, res) => {
		if (req.url === "/") {
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(readFileSync(htmlPath, "utf8"));
			return;
		}
		if (req.url?.startsWith("/fonts/")) {
			const filePath = join(root, "public", req.url);
			res.writeHead(200, { "Content-Type": "font/woff2" });
			res.end(readFileSync(filePath));
			return;
		}
		res.writeHead(404).end();
	});

	await new Promise((resolve) => server.listen(0, resolve));
	const port = server.address().port;

	const browser = await puppeteer.launch({
		executablePath: chromePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const page = await browser.newPage();
		await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle0" });
		const result = await page.evaluate(
			async ({ fontUrl, renderSize, char, inkThreshold }) => {
				const face = new FontFace("bench", `url(${fontUrl})`);
				await face.load();
				document.fonts.add(face);

				const canvas = document.createElement("canvas");
				canvas.width = 128;
				canvas.height = 128;
				const ctx = canvas.getContext("2d");
				if (!ctx) return { rows: [], width: 0 };

				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, 128, 128);
				ctx.fillStyle = "#000000";
				ctx.font = `${renderSize}px bench`;
				ctx.textBaseline = "top";
				ctx.imageSmoothingEnabled = false;
				ctx.fillText(char, 0, 0);

				const image = ctx.getImageData(0, 0, 128, 128);
				let minX = 128;
				let minY = 128;
				let maxX = -1;
				let maxY = -1;

				for (let y = 0; y < 128; y++) {
					for (let x = 0; x < 128; x++) {
						const i = (y * 128 + x) * 4;
						const r = image.data[i];
						const g = image.data[i + 1];
						const b = image.data[i + 2];
						if (Math.min(r, g, b) < inkThreshold) {
							minX = Math.min(minX, x);
							minY = Math.min(minY, y);
							maxX = Math.max(maxX, x);
							maxY = Math.max(maxY, y);
						}
					}
				}

				if (maxX < minX || maxY < minY) return { rows: [], width: 0 };

				const rows = [];
				for (let y = minY; y <= maxY; y++) {
					let row = "";
					for (let x = minX; x <= maxX; x++) {
						const i = (y * 128 + x) * 4;
						row +=
							Math.min(
								image.data[i],
								image.data[i + 1],
								image.data[i + 2],
							) < inkThreshold
								? "1"
								: "0";
					}
					rows.push(row);
				}

				return { rows, width: maxX - minX + 1 };
			},
			{
				fontUrl,
				renderSize,
				char: testCase.char,
				inkThreshold: source.inkDetection === "nonWhite" ? 240 : 128,
			},
		);

		return result;
	} finally {
		await browser.close();
		server.close();
	}
}

async function main() {
	const args = parseArgs(process.argv);
	const cases = fixtures.cases.filter((testCase) =>
		args.source ? testCase.sourceId === args.source : true,
	);

	let failures = 0;

	for (const testCase of cases) {
		const source = manifest.sources.find((entry) => entry.id === testCase.sourceId);
		if (!source) {
			console.error(`Unknown source for fixture ${testCase.id}`);
			failures++;
			continue;
		}

		const traced = traceFixtureCase(source, testCase);
		const comparison = alignRows(
			compactRows(traced.rows),
			compactRows(testCase.rows),
			testCase.align ?? "center",
		);
		const passed = comparison.score >= (testCase.minScore ?? 0.9);
		const status = passed ? "PASS" : "FAIL";

		console.log(
			`\n${status} ${testCase.id}  score=${(comparison.score * 100).toFixed(1)}%  min=${((testCase.minScore ?? 0.9) * 100).toFixed(0)}%`,
		);
		if (testCase.note) console.log(` note: ${testCase.note}`);
		console.log(" expected:");
		comparison.expectedRows.forEach((row) => console.log(`  ${row}`));
		console.log(" actual (trace):");
		comparison.actualRows.forEach((row) => console.log(`  ${row}`));

		if (!passed) {
			failures++;
			if (comparison.diffs.length > 0) {
				console.log(" first diffs:", comparison.diffs);
			}
		}

		if (args.browser) {
			const browser = await traceWithBrowser(testCase, source);
			const browserCompare = alignRows(
				compactRows(traced.rows),
				compactRows(trimRows(browser.rows)),
				testCase.align ?? "center",
			);
			const browserPassed = browserCompare.score >= 0.9;
			console.log(
				` trace↔browser: ${browserPassed ? "PASS" : "FAIL"} ${(browserCompare.score * 100).toFixed(1)}%`,
			);
			console.log(" browser:");
			trimRows(browser.rows).forEach((row) => console.log(`  ${row}`));
			if (!browserPassed) failures++;
		}
	}

	if (failures > 0) {
		console.error(`\n${failures} fixture(s) failed`);
		process.exit(1);
	}

	console.log(`\nAll ${cases.length} fixture(s) passed`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
