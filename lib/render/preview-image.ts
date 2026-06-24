import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { DEFAULT_MODEL_NAME } from "@/lib/trmnl/types";
import type { Device } from "@/lib/types";

/**
 * Client-safe builders for `/api/bitmap` preview URLs.
 *
 * Every preview points at `/api/bitmap/<path>.png`. The `.png` suffix is
 * cosmetic: the route strips the extension and renders the real format
 * (bmp/webp/png) from the `model`/`palette_id` query params, and the browser
 * picks the format from the response `Content-Type`. Keeping a single source
 * of truth here means the dashboard, device pages, and authoring previews
 * can't drift apart (which previously caused mixup devices to render the wrong
 * screen on the dashboard).
 */

type DeviceProfileInput = Pick<Device, "model" | "palette_id">;
type DevicePreviewInput = DeviceProfileInput &
	Pick<Device, "screen" | "display_mode" | "mixup_id">;

function bitmapUrl(path: string, params: URLSearchParams): string {
	return `/api/bitmap/${path}.png?${params.toString()}`;
}

/**
 * width/height + model + palette so the bitmap route resolves the right device
 * profile from the URL alone (an `<img>` fetch doesn't replay device headers).
 */
export function buildDeviceProfileQuery(
	device: DeviceProfileInput,
	width: number,
	height: number,
): URLSearchParams {
	const params = new URLSearchParams({
		width: String(width),
		height: String(height),
		model: device.model?.trim() || DEFAULT_MODEL_NAME,
	});
	const paletteId = device.palette_id?.trim();
	if (paletteId) {
		params.set("palette_id", paletteId);
	}
	return params;
}

export function buildDeviceErrorPreviewSrc(
	device: DeviceProfileInput,
	width: number,
	height: number,
	message: string,
): string {
	const params = buildDeviceProfileQuery(device, width, height);
	params.set("message", message);
	return bitmapUrl("error", params);
}

/** A single recipe screen rendered with a specific device's profile. */
export function buildScreenPreviewSrc(
	screen: string,
	device: DeviceProfileInput,
	width: number,
	height: number,
): string {
	return bitmapUrl(screen, buildDeviceProfileQuery(device, width, height));
}

/**
 * The image that represents a device's current display mode, mirroring the
 * `/api/display` logic:
 *   - mixup    -> the composite
 *   - playlist -> `playlistScreen` (callers resolve the active/first item,
 *                 since the truly-active item needs server-side scheduling)
 *   - screen   -> the configured recipe
 * Falls back to an error preview when the mode has nothing to show.
 */
export function buildDevicePreviewSrc(
	device: DevicePreviewInput,
	{
		width,
		height,
		playlistScreen,
	}: { width: number; height: number; playlistScreen?: string | null },
): string {
	if (device.display_mode === DeviceDisplayMode.MIXUP && device.mixup_id) {
		return bitmapUrl(
			`mixup/${device.mixup_id}`,
			buildDeviceProfileQuery(device, width, height),
		);
	}
	if (device.display_mode === DeviceDisplayMode.PLAYLIST) {
		return playlistScreen
			? buildScreenPreviewSrc(playlistScreen, device, width, height)
			: buildDeviceErrorPreviewSrc(
					device,
					width,
					height,
					"Playlist has no screens",
				);
	}
	return device.screen
		? buildScreenPreviewSrc(device.screen, device, width, height)
		: buildDeviceErrorPreviewSrc(
				device,
				width,
				height,
				"Device screen is not configured",
			);
}

/**
 * Generic screen/mixup preview at default resolution with no specific device
 * profile — used by authoring surfaces (playlist filmstrip, reel card, live
 * preview, mixup list). `path` is a recipe slug or `mixup/<id>`.
 */
export function buildBitmapPreviewSrc(
	path: string,
	{
		width = DEFAULT_IMAGE_WIDTH,
		height = DEFAULT_IMAGE_HEIGHT,
	}: { width?: number; height?: number } = {},
): string {
	return bitmapUrl(
		path,
		new URLSearchParams({ width: String(width), height: String(height) }),
	);
}
