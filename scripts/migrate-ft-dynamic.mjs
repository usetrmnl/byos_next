#!/usr/bin/env node
/**
 * Migrate hand-edited FT bitmap-font.json to dynamic-width v2 faces (0×H keys)
 * with per-face metrics inferred from glyph ink bounds.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const packPath = join(root, "components/bitmap-font/bitmap-font.json");

function inferMetricsFromGlyphs(glyphs, fallback) {
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const glyph of Object.values(glyphs)) {
		if (glyph.bounds) {
			minY = Math.min(minY, glyph.bounds.minY);
			maxY = Math.max(maxY, glyph.bounds.maxY);
		}
		for (const { y } of glyph.rows ?? []) {
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
		return { ...fallback, dynamicWidth: true };
	}

	return {
		...fallback,
		minY,
		maxY,
		descenderY: Math.min(fallback.descenderY ?? minY, minY),
		capHeightY: Math.max(fallback.capHeightY ?? maxY, maxY),
		baselineY: 0,
		dynamicWidth: true,
	};
}

const pack = JSON.parse(readFileSync(packPath, "utf8"));
const newFaces = {};

for (const [key, face] of Object.entries(pack.faces ?? {})) {
	const [, height] = key.split("x").map(Number);
	const newKey = `0x${height}`;
	const metrics = inferMetricsFromGlyphs(face.glyphs, pack.metadata.metrics);
	newFaces[newKey] = {
		metrics,
		glyphs: face.glyphs,
	};
}

const allGlyphs = Object.values(newFaces).flatMap((face) =>
	Object.values(face.glyphs),
);
const combined = {};
for (const glyph of allGlyphs) {
	combined[glyph.char] = glyph;
}

pack.metadata.metrics = inferMetricsFromGlyphs(
	combined,
	pack.metadata.metrics,
);
pack.faces = newFaces;

writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(
	`Migrated FT pack to dynamic-width faces: ${Object.keys(newFaces).join(", ")}`,
);
