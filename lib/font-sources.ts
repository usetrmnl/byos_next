import manifest from "./font-sources.json";

export type FontFormat = "ttf" | "otf" | "woff2";

export type TraceMode = "fit" | "pixelSnap" | "metricSnap";
export type InkDetection = "luminance" | "nonWhite" | "anyDark";

export type BitmapGrid = {
	width?: number;
	height?: number;
	/** Override source file for this grid (e.g. Geneva 9 vs 12). */
	file?: string;
	/** Canvas font size; defaults to preloadSize or grid height. */
	renderSize?: number;
	traceMode?: TraceMode;
	pixelSnap?: boolean;
	centerHorizontally?: boolean;
	inkDetection?: InkDetection;
	dynamicWidth?: boolean;
	/** Run probe benchmark to derive cell height / line metrics. */
	discoverGrid?: boolean;
	benchmarkProbes?: string;
};

export type FontSource = {
	id: string;
	label: string;
	license: string;
	file: string;
	format: FontFormat;
	takumiName?: string;
	tailwindSlug?: string;
	cssVariable?: string;
	preloadSize: number;
	dynamicWidth: boolean;
	traceMode?: TraceMode;
	pixelSnap?: boolean;
	centerHorizontally?: boolean;
	inkDetection?: InkDetection;
	discoverGrid?: boolean;
	benchmarkProbes?: string;
	weight: number;
	bitmapGrids?: BitmapGrid[];
	generatedJson?: string;
};

export type BuiltInBitmapPack = {
	id: string;
	label: string;
	packPath: string;
	sourceId?: string;
	/** Omit from bitmap font designer pickers (still generated at build). */
	hidden?: boolean;
};

export const FONT_SOURCES: FontSource[] = manifest.sources as FontSource[];

export const BUILT_IN_BITMAP_PACKS: BuiltInBitmapPack[] = manifest.builtInPacks;

export const FONT_SOURCE_BY_ID = Object.fromEntries(
	FONT_SOURCES.map((source) => [source.id, source]),
) as Record<string, FontSource>;

export const TAILWIND_SLUG_TO_TAKUMI = Object.fromEntries(
	FONT_SOURCES.filter((source) => source.tailwindSlug && source.takumiName).map(
		(source) => [source.tailwindSlug, source.takumiName],
	),
) as Record<string, string>;

export function getFontPublicPath(source: FontSource): string {
	return `/fonts/${source.file}`;
}

export function getFontDiskPath(
	source: FontSource,
	cwd = process.cwd(),
): string {
	return `${cwd}/public/fonts/${source.file}`;
}

export function getTakumiFontSources(): FontSource[] {
	return FONT_SOURCES.filter((source) => source.takumiName);
}
