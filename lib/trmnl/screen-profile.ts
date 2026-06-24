import type { TrmnlModel, TrmnlPalette } from "@/lib/trmnl/types";

export type ScreenSizeTier = "sm" | "md" | "lg";
export type ScreenDensity = "1x" | "2x";
export type ScreenOrientation = "landscape" | "portrait" | "square";

export type ScreenProfile = {
	modelName?: string;
	modelLabel?: string;
	physicalWidth: number;
	physicalHeight: number;
	logicalWidth: number;
	logicalHeight: number;
	pixelRatio: number;
	ditherPixelRatio: number;
	uiScale: number;
	gapScale: number;
	sizeTier: ScreenSizeTier;
	density: ScreenDensity;
	orientation: ScreenOrientation;
	aspectRatio: number;
	colors: number;
	bitDepth: number;
	supportsColor: boolean;
	isCompact: boolean;
	isHalfScreen: boolean;
	isLarge: boolean;
	paletteId?: string;
};

const DEFAULT_SIZE_TIER: ScreenSizeTier = "md";
const DEFAULT_DENSITY: ScreenDensity = "1x";

function cssVariables(raw: unknown): Record<string, string> {
	if (!raw) return {};
	if (Array.isArray(raw)) {
		return Object.fromEntries(
			raw.flatMap((entry) =>
				Array.isArray(entry) &&
				entry.length === 2 &&
				typeof entry[0] === "string" &&
				typeof entry[1] === "string"
					? [[entry[0], entry[1]]]
					: [],
			),
		);
	}
	if (typeof raw === "object") {
		return Object.fromEntries(
			Object.entries(raw).flatMap(([key, value]) =>
				typeof value === "string" ? [[key, value]] : [],
			),
		);
	}
	return {};
}

function parsePx(value: string | undefined): number | null {
	if (!value) return null;
	const parsed = Number.parseFloat(value.replace("px", ""));
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNumber(value: string | undefined): number | null {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseSizeTier(model: TrmnlModel | null | undefined): ScreenSizeTier {
	const sizeClass = model?.css?.classes?.size;
	if (sizeClass === "screen--sm") return "sm";
	if (sizeClass === "screen--lg") return "lg";
	return DEFAULT_SIZE_TIER;
}

function parseDensity(model: TrmnlModel | null | undefined): ScreenDensity {
	const densityClass = model?.css?.classes?.density;
	return densityClass === "screen--density-2x" ? "2x" : DEFAULT_DENSITY;
}

function orientationFor(width: number, height: number): ScreenOrientation {
	if (width > height) return "landscape";
	if (height > width) return "portrait";
	return "square";
}

function fallbackPixelRatio(model: TrmnlModel | null | undefined): number {
	if (model?.scale_factor && model.scale_factor > 0) {
		return model.scale_factor;
	}
	return 1;
}

function roundDimension(value: number): number {
	return Math.max(1, Math.round(value));
}

export function createScreenProfile({
	width,
	height,
	model,
	palette,
}: {
	width: number;
	height: number;
	model?: TrmnlModel | null;
	palette?: TrmnlPalette | null;
}): ScreenProfile {
	const vars = cssVariables(model?.css?.variables);
	const pixelRatio =
		parseNumber(vars["--pixel-ratio"]) ?? fallbackPixelRatio(model);
	const ditherPixelRatio =
		parseNumber(vars["--dither-pixel-ratio"]) ?? pixelRatio;
	const uiScale = parseNumber(vars["--ui-scale"]) ?? 1;
	const gapScale = parseNumber(vars["--gap-scale"]) ?? 1;

	const baseLogicalWidth =
		parsePx(vars["--screen-w"]) ??
		roundDimension((model?.width ?? width) / pixelRatio);
	const baseLogicalHeight =
		parsePx(vars["--screen-h"]) ??
		roundDimension((model?.height ?? height) / pixelRatio);

	const isModelNative =
		model &&
		((width === model.width && height === model.height) ||
			(width === model.height && height === model.width));
	const isSwappedNative = Boolean(
		model && width === model.height && height === model.width,
	);

	const logicalWidth =
		isModelNative && !isSwappedNative
			? baseLogicalWidth
			: isModelNative && isSwappedNative
				? baseLogicalHeight
				: roundDimension(width / pixelRatio);
	const logicalHeight =
		isModelNative && !isSwappedNative
			? baseLogicalHeight
			: isModelNative && isSwappedNative
				? baseLogicalWidth
				: roundDimension(height / pixelRatio);

	const orientation = orientationFor(logicalWidth, logicalHeight);
	const sizeTier = parseSizeTier(model);
	const isHalfScreen = logicalWidth <= 520 && logicalHeight <= 520;
	const isCompact =
		sizeTier === "sm" ||
		isHalfScreen ||
		logicalWidth < 640 ||
		logicalHeight < 420;
	const colors = model?.colors ?? palette?.colors?.length ?? 2;
	const bitDepth =
		model?.bit_depth ??
		palette?.grayscale_bit_depth ??
		palette?.channel_bit_depth ??
		1;
	const supportsColor = Boolean(
		palette?.colors?.length ||
			palette?.id?.startsWith("color-") ||
			(palette?.channel_bit_depth && palette.channel_bit_depth > 0),
	);

	return {
		modelName: model?.name,
		modelLabel: model?.label,
		physicalWidth: width,
		physicalHeight: height,
		logicalWidth,
		logicalHeight,
		pixelRatio,
		ditherPixelRatio,
		uiScale,
		gapScale,
		sizeTier,
		density: parseDensity(model),
		orientation,
		aspectRatio: logicalWidth / logicalHeight,
		colors,
		bitDepth,
		supportsColor,
		isCompact,
		isHalfScreen,
		isLarge: sizeTier === "lg" || logicalWidth >= 1000 || logicalHeight >= 720,
		paletteId: palette?.id,
	};
}
