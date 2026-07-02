import { DitheringMethod } from "@/utils/image-processing";
import type { PaletteReductionMode } from "./palette-reduction";

export type ImageDitherMethod =
	| "bayer"
	| "white-noise"
	| "floyd-steinberg"
	| "atkinson"
	| "threshold"
	| "snap"
	| "none";

export const DEFAULT_IMAGE_DITHER_METHOD: ImageDitherMethod = "bayer";

export function normalizeImageDitherMethod(
	method: ImageDitherMethod | undefined,
): ImageDitherMethod {
	return method ?? DEFAULT_IMAGE_DITHER_METHOD;
}

export function imageDitherMethodToPaletteMode(
	method: ImageDitherMethod,
): PaletteReductionMode {
	if (method === "floyd-steinberg") return "floyd-steinberg";
	if (method === "bayer") return "bayer";
	return "snap";
}

export function imageDitherMethodToGrayscaleMethod(
	method: ImageDitherMethod,
): DitheringMethod {
	switch (method) {
		case "white-noise":
			return DitheringMethod.WHITE_NOISE;
		case "floyd-steinberg":
			return DitheringMethod.FLOYD_STEINBERG;
		case "atkinson":
			return DitheringMethod.ATKINSON;
		case "threshold":
			return DitheringMethod.THRESHOLD;
		case "snap":
		case "none":
			return DitheringMethod.NONE;
		default:
			return DitheringMethod.BAYER;
	}
}

export function parseRecipeImageDitherSetting(
	value: false | ImageDitherMethod | "floyd-steinberg" | undefined,
): ImageDitherMethod | null {
	if (value === false) return null;
	if (value === undefined) return DEFAULT_IMAGE_DITHER_METHOD;
	return value;
}
