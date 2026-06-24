#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { generateBitmapFontJson } from "./lib/trace-glyph-node.mjs";
import { convertLegacyPackToV2 } from "./lib/convert-legacy-font.mjs";
import {
	applyDerivedMetricsToV2Pack,
	applyManualMetricsFromSource,
	manualFaceKeysFromSource,
} from "./lib/metrics-derive.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const manifest = JSON.parse(
	readFileSync(join(root, "lib/font-sources.json"), "utf8"),
);

const outDir = join(root, "components/bitmap-font/generated");
mkdirSync(outDir, { recursive: true });

const writeV2Pack = (pack, outPath, source) => {
	const normalized = Array.isArray(pack.fonts)
		? ensureLegacyMetrics(pack)
		: pack;
	if (Array.isArray(normalized.fonts)) {
		const converted = convertLegacyPackToV2(normalized);
		const withManual = source
			? applyManualMetricsFromSource(converted, source)
			: converted;
		const final = applyDerivedMetricsToV2Pack(withManual, {
			manualFaceKeys: source ? manualFaceKeysFromSource(source) : [],
		});
		writeFileSync(outPath, `${JSON.stringify(final, null, 2)}\n`);
		return;
	}
	const final = applyDerivedMetricsToV2Pack(pack);
	writeFileSync(outPath, `${JSON.stringify(final, null, 2)}\n`);
};

function ensureLegacyMetrics(pack) {
	const firstFace = pack.fonts?.[0];
	if (!firstFace) return pack;

	const facesWithMetrics = pack.fonts.map((face) =>
		face.metrics
			? face
			: {
					...face,
					metrics: {
						cellHeight: face.height,
						capTop: 0,
						baselineRow: face.height - 1,
						descenderDepth: 0,
						xHeight: Math.max(1, Math.floor(face.height * 0.6)),
						lineHeight: face.height,
						pixelUnitX: 1,
						pixelUnitY: 1,
						dynamicWidth: face.width === 0,
					},
				},
	);

	return {
		...pack,
		fonts: facesWithMetrics,
		metadata: {
			...pack.metadata,
			metrics:
				pack.metadata?.metrics ??
				facesWithMetrics[0]?.metrics ??
				undefined,
		},
	};
}

for (const source of manifest.sources) {
	if (!source.bitmapGrids?.length || !source.generatedJson) continue;

	const legacyOutput = generateBitmapFontJson(source);
	const outPath = join(root, source.generatedJson);
	mkdirSync(dirname(outPath), { recursive: true });
	writeV2Pack(legacyOutput, outPath, source);
	console.log(
		`Wrote ${source.generatedJson} (${legacyOutput.fonts.length} grid size(s), v2)`,
	);
}

console.log("Bitmap font generation complete.");
