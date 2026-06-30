import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import {
	deviceRenderTargetNeedsReduction,
	resolveDeviceRenderTarget,
} from "@/lib/trmnl/palette-colors";
import type { RecipeRenderSettings } from "../types";

export type ImageDitherPolicy =
	| { mode: "off" }
	// Palette targets use Floyd-Steinberg; low channel-depth targets use local
	// channel snapping inside prepareImageForDevice.
	| { mode: "floyd-steinberg"; profile: DeviceProfile };

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
	if (renderSettings?.imageDither === false) {
		return IMAGE_DITHER_OFF;
	}

	return hasDeviceImagePreparationTarget(profile)
		? { mode: "floyd-steinberg", profile }
		: IMAGE_DITHER_OFF;
}
