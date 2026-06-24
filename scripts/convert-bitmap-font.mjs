#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { convertLegacyBitmapFont } from "./lib/convert-legacy-font.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const fontIndex = Number.parseInt(process.argv[4] ?? "0", 10);
const useCharCodeKeys = process.argv.includes("--char-code-keys");

if (!inputPath || !outputPath) {
	console.error(
		"Usage: node scripts/convert-bitmap-font.mjs <input.json> <output.json> [fontIndex] [--char-code-keys]",
	);
	process.exit(1);
}

const legacy = JSON.parse(readFileSync(join(root, inputPath), "utf8"));
const converted = convertLegacyBitmapFont(legacy, {
	fontIndex,
	useCharCodeKeys,
});

const absoluteOutput = join(root, outputPath);
mkdirSync(dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${JSON.stringify(converted, null, 2)}\n`);

console.log(
	`Converted ${inputPath} → ${outputPath} (${Object.keys(converted.glyphs).length} glyphs)`,
);
