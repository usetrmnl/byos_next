import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { buildDeviceImageUrl } from "@/lib/render/device-image-url";
import {
	type DeviceProfile,
	getDeviceProfile,
} from "@/lib/trmnl/device-profile";
import { type GrayscaleLevel, normalizeGrayscale } from "@/lib/trmnl/grayscale";
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
	grayscaleLevels: GrayscaleLevel;
	imageUrl: string;
	baseQueryParams: string;
};

function defaultDimensions(
	profile: DeviceProfile,
	device: Pick<Device, "screen_orientation" | "screen_width" | "screen_height">,
): { width: number; height: number } {
	const orientation = device.screen_orientation || "landscape";
	const deviceWidth =
		orientation === "landscape" ? device.screen_width : device.screen_height;
	const deviceHeight =
		orientation === "landscape" ? device.screen_height : device.screen_width;
	return {
		width: deviceWidth || profile.model.width || DEFAULT_IMAGE_WIDTH,
		height: deviceHeight || profile.model.height || DEFAULT_IMAGE_HEIGHT,
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
	const dimensions = defaultDimensions(profile, device);
	const width = hints.width || dimensions.width;
	const height = hints.height || dimensions.height;
	const grayscaleLevels = normalizeGrayscale(device.grayscale);
	if (!device.screen) {
		throw new Error("Device screen is not configured");
	}
	const screen = device.screen;

	// Image URLs must be self-contained. If the URL only carried width/
	// height/grayscale, the bitmap route would infer model and palette from
	// request headers — and a fetch from a browser, a
	// caching proxy, or any tool that doesn't replay the device's headers
	// would render against the wrong profile. `model` and `palette_id` go
	// into the URL so the right profile is selected purely from the URL.
	const params = new URLSearchParams({
		width: String(width),
		height: String(height),
		grayscale: String(grayscaleLevels),
	});
	if (profile.model.name) {
		params.set("model", profile.model.name);
	}
	if (profile.palette?.id) {
		params.set("palette_id", profile.palette.id);
	}
	if (hints.base64) {
		params.set("base64", "true");
	}
	const baseQueryParams = params.toString();

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
