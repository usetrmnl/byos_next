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
}: {
	renderSettings: RecipeRenderSettings | null | undefined;
	profile: DeviceProfile | null | undefined;
}): ImageDitherPolicy {
	const method = parseRecipeImageDitherSetting(renderSettings?.imageDither);
	if (method === null) {
		return IMAGE_DITHER_OFF;
	}

	return hasDeviceImagePreparationTarget(profile)
		? { mode: "on", profile, method }
		: IMAGE_DITHER_OFF;
}

export { DEFAULT_IMAGE_DITHER_METHOD };
