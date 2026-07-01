import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import {
	type ImageDitherMethod,
	prepareDeviceImage,
	type PrepareDeviceImageInput,
	type PreparedDeviceImage,
} from "./prepare-device-image";

export type { ImageDitherMethod, PrepareDeviceImageInput, PreparedDeviceImage };

export async function prepareImageForDevice(
	input: PrepareDeviceImageInput,
): Promise<PreparedDeviceImage> {
	return prepareDeviceImage(input);
}

export type LegacyPrepareImageForDeviceInput = {
	src: string | Buffer | Uint8Array;
	profile: DeviceProfile;
	width?: number;
	height?: number;
	dither?: ImageDitherMethod | "floyd-steinberg";
};

/** @deprecated Use prepareDeviceImage with `method` instead. */
export async function prepareImageForDeviceLegacy({
	dither,
	...input
}: LegacyPrepareImageForDeviceInput): Promise<PreparedDeviceImage> {
	return prepareDeviceImage({
		...input,
		method: dither ?? "bayer",
	});
}
