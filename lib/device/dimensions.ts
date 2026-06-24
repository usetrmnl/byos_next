import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";

export type DeviceDimensionInput = {
	screen_width?: number | null;
	screen_height?: number | null;
	screen_orientation?: string | null;
};

export function getOrientedDeviceDimensions(
	device: DeviceDimensionInput | null | undefined,
) {
	const isPortrait = device?.screen_orientation === "portrait";
	const width = isPortrait
		? device?.screen_height || DEFAULT_IMAGE_HEIGHT
		: device?.screen_width || DEFAULT_IMAGE_WIDTH;
	const height = isPortrait
		? device?.screen_width || DEFAULT_IMAGE_WIDTH
		: device?.screen_height || DEFAULT_IMAGE_HEIGHT;

	return { width, height, isPortrait };
}
