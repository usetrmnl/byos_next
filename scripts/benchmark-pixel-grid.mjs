#!/usr/bin/env node
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { discoverGridForSource } from "./lib/discover-pixel-grid.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const manifest = JSON.parse(
	readFileSync(join(root, "lib/font-sources.json"), "utf8"),
);

const sourceId = process.argv[2] ?? "geistPixelSquare";
const source = manifest.sources.find((entry) => entry.id === sourceId);

if (!source) {
	console.error(`Unknown source: ${sourceId}`);
	process.exit(1);
}

const metrics = discoverGridForSource(source, root);
console.log(JSON.stringify(metrics, null, 2));
