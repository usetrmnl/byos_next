import {
	DEFAULT_IMAGE_DITHER_METHOD,
	type ImageDitherMethod,
	parseRecipeImageDitherSetting,
} from "@/lib/render/image-dither-method";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import {
	deviceRenderTargetNeedsReduction,
	resolveDeviceRenderTarget,
} from "@/lib/trmnl/palette-colors";
import type { RecipeRenderSettings } from "../types";

export type ImageDitherPolicy =
	| { mode: "off" }
	| {
			mode: "on";
			profile: DeviceProfile;
			method: ImageDitherMethod;
			/**
			 * Logical-layout-px -> physical-screen-px scale for image
			 * dimensions passed into the intercept. Must match the scale the
			 * finished recipe is later composited at (see
			 * `wrapLogicalCanvasToTarget`) so the dither pattern survives
			 * 1:1 — dithering at logical size and then scaling up blurs it.
			 * Defaults to `1` for pipelines that already render at physical
			 * size (e.g. the Liquid/Puppeteer path).
			 */
			pixelRatio: number;
	  };

export const IMAGE_DITHER_OFF: ImageDitherPolicy = { mode: "off" };

export function hasDeviceImagePreparationTarget(
	profile: DeviceProfile | null | undefined,
): profile is DeviceProfile {
	return Boolean(
		profile &&
			deviceRenderTargetNeedsReduction(
				resolveDeviceRenderTarget(profile.palette),
			),
	);
}

export function resolveImageDitherPolicy({
	renderSettings,
	profile,
	pixelRatio = 1,
}: {
	renderSettings: RecipeRenderSettings | null | undefined;
	profile: DeviceProfile | null | undefined;
	/** See `ImageDitherPolicy.pixelRatio`. */
	pixelRatio?: number;
}): ImageDitherPolicy {
	const method = parseRecipeImageDitherSetting(renderSettings?.imageDither);
	if (method === null) {
		return IMAGE_DITHER_OFF;
	}

	return hasDeviceImagePreparationTarget(profile)
		? { mode: "on", profile, method, pixelRatio }
		: IMAGE_DITHER_OFF;
}

export { DEFAULT_IMAGE_DITHER_METHOD };
