/**
 * TRMNL device + palette type definitions. This file is pure types so
 * it can be imported by client components without dragging the
 * server-only registry runtime (`node:fs/promises`, network fetches,
 * caches) into the client bundle.
 */

export type RegistryResource = "models" | "palettes" | "categories" | "ips";

export type TrmnlModel = {
	name: string;
	label: string;
	description?: string;
	width: number;
	height: number;
	colors: number;
	bit_depth: number;
	scale_factor: number;
	rotation: number;
	mime_type: string;
	offset_x: number;
	offset_y: number;
	kind?: string;
	palette_ids: string[];
	preview_white_point?: string;
	image_size_limit?: number;
	image_upload_supported?: boolean;
	css?: {
		classes?: Record<string, string>;
		variables?: Record<string, string>;
	};
};

/** Default model name when none is supplied by the device. */
export const DEFAULT_MODEL_NAME = "og_plus";

export type TrmnlPalette = {
	id: string;
	name: string;
	grays?: number;
	framework_class?: string;
	/**
	 * Hex color list for discrete-color palettes (color-3bwr, color-4bwry,
	 * color-6a, color-7a, …). Absent for grayscale palettes (bw, gray-4,
	 * gray-16, gray-256) where colors are derived from `grays` count, and
	 * for the continuous palettes color-12bit / color-24bit.
	 */
	colors?: string[];
	grayscale_bit_depth?: number;
	[key: string]: unknown;
};

export type DeviceProfile = {
	model: TrmnlModel;
	palette: TrmnlPalette | null;
	/** True when we couldn't resolve the requested model and fell back. */
	fallback: boolean;
};
