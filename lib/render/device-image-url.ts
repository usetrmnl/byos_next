import { getImageFilenameExtension } from "@/lib/render/device-image";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";

const IMAGE_EXTENSION_PATTERN = /\.(bmp|png|webp|jpe?g)$/i;

export function stripImageExtension(imagePath: string): string {
	return imagePath.replace(IMAGE_EXTENSION_PATTERN, "");
}

export function buildDeviceImageFilename(
	imagePath: string,
	uniqueId: string,
	profile: DeviceProfile,
): string {
	return `${stripImageExtension(imagePath)}_${uniqueId}.${getImageFilenameExtension(profile)}`;
}

export function buildDeviceImageUrl({
	baseUrl,
	imagePath,
	profile,
	query,
}: {
	baseUrl: string;
	imagePath: string;
	profile: DeviceProfile;
	query?: string;
}): string {
	const normalizedPath = stripImageExtension(imagePath);
	const extension = getImageFilenameExtension(profile);
	const suffix = query ? `?${query}` : "";

	return `${baseUrl}/${normalizedPath}.${extension}${suffix}`;
}
