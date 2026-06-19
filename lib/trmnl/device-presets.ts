import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";

export const DEVICE_SIZE_PRESETS = {
	"800x480": { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT },
	"1872x1404": { width: 1872, height: 1404 },
	custom: null,
} as const;

export type DeviceSizePreset = keyof typeof DEVICE_SIZE_PRESETS;

export function detectDeviceSizePreset(
	width: number,
	height: number,
): DeviceSizePreset {
	for (const [preset, size] of Object.entries(DEVICE_SIZE_PRESETS)) {
		if (size && size.width === width && size.height === height) {
			return preset as DeviceSizePreset;
		}
	}
	return "custom";
}
