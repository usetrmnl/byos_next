#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { generateBitmapFontJson } from "./lib/trace-glyph-node.mjs";
import { convertLegacyPackToV2 } from "./lib/convert-legacy-font.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const manifest = JSON.parse(
	readFileSync(join(root, "lib/font-sources.json"), "utf8"),
);

const outDir = join(root, "components/bitmap-font/generated");
mkdirSync(outDir, { recursive: true });

const writeV2Pack = (pack, outPath) => {
	const normalized = Array.isArray(pack.fonts)
		? ensureLegacyMetrics(pack)
		: pack;
	const converted = Array.isArray(normalized.fonts)
		? convertLegacyPackToV2(normalized)
		: normalized;
	writeFileSync(outPath, `${JSON.stringify(converted, null, 2)}\n`);
};

function ensureLegacyMetrics(pack) {
	if (pack.metadata?.metrics) return pack;

	const firstFace = pack.fonts?.[0];
	if (!firstFace) return pack;

	return {
		...pack,
		metadata: {
			...pack.metadata,
			metrics: {
				cellHeight: firstFace.height,
				capTop: 0,
				baselineRow: firstFace.height - 1,
				descenderDepth: 0,
				xHeight: Math.max(1, Math.floor(firstFace.height * 0.6)),
				lineHeight: firstFace.height,
			},
		},
	};
}

for (const source of manifest.sources) {
	if (!source.bitmapGrids?.length || !source.generatedJson) continue;

	const legacyOutput = generateBitmapFontJson(source);
	const outPath = join(root, source.generatedJson);
	mkdirSync(dirname(outPath), { recursive: true });
	writeV2Pack(legacyOutput, outPath);
	console.log(
		`Wrote ${source.generatedJson} (${legacyOutput.fonts.length} grid size(s), v2)`,
	);
}

console.log("Bitmap font generation complete.");
