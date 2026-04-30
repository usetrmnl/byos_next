import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { buildDeviceImageUrl } from "@/lib/render/device-image-url";
import {
	type DeviceProfile,
	getDeviceProfile,
} from "@/lib/trmnl/device-profile";
import type { Device } from "@/lib/types";

/**
 * Single source of truth for "what should this device display?".
 *
 * Both `/api/display` (TRMNL device callback) and `/api/display/current`
 * (admin/debug surface) need to derive: which screen, what physical
 * dimensions, what grayscale level, and what image URL to fetch. They
 * each had their own near-duplicate implementation; this extracts it.
 *
 * The `/api/display` route still adds playlist/mixup/firmware concerns
 * on top — those don't belong in here because they mutate device state.
 */

type RequestHints = {
	hostUrl: string;
	width?: number | null;
	height?: number | null;
	base64?: boolean;
};

export type DisplaySelection = {
	screen: string;
	profile: DeviceProfile;
	width: number;
	height: number;
	grayscaleLevels: 2 | 4 | 16;
	imageUrl: string;
	baseQueryParams: string;
};

const VALID_GRAYSCALE = new Set([2, 4, 16]);

function normalizeGrayscale(value: number | null | undefined): 2 | 4 | 16 {
	if (value && VALID_GRAYSCALE.has(value)) return value as 2 | 4 | 16;
	return 2;
}

function defaultDimensions(
	profile: DeviceProfile,
	device: Pick<Device, "screen_orientation" | "screen_width" | "screen_height">,
): { width: number; height: number } {
	const orientation = device.screen_orientation || "landscape";
	const fallbackWidth =
		orientation === "landscape"
			? device.screen_width || DEFAULT_IMAGE_WIDTH
			: device.screen_height || DEFAULT_IMAGE_HEIGHT;
	const fallbackHeight =
		orientation === "landscape"
			? device.screen_height || DEFAULT_IMAGE_HEIGHT
			: device.screen_width || DEFAULT_IMAGE_WIDTH;
	return {
		width: profile.model.width || fallbackWidth,
		height: profile.model.height || fallbackHeight,
	};
}

export async function selectDisplayForDevice(
	device: Pick<
		Device,
		| "screen"
		| "model"
		| "palette_id"
		| "grayscale"
		| "screen_orientation"
		| "screen_width"
		| "screen_height"
	>,
	hints: RequestHints,
): Promise<DisplaySelection> {
	const profile = await getDeviceProfile(device.model, device.palette_id);
	const fallback = defaultDimensions(profile, device);
	const width = hints.width || fallback.width;
	const height = hints.height || fallback.height;
	const grayscaleLevels = normalizeGrayscale(device.grayscale);
	const screen = device.screen || "not-found";

	const baseQueryParams = `width=${width}&height=${height}&grayscale=${grayscaleLevels}${
		hints.base64 ? "&base64=true" : ""
	}`;

	const imageUrl = buildDeviceImageUrl({
		baseUrl: `${hints.hostUrl}/api/bitmap`,
		imagePath: screen,
		profile,
		query: baseQueryParams,
	});

	return {
		screen,
		profile,
		width,
		height,
		grayscaleLevels,
		imageUrl,
		baseQueryParams,
	};
}
