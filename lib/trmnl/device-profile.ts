/**
 * Resolve a fully-described render profile for a device by joining its stored
 * `model` (and optional `palette_id` override) with the local TRMNL registry.
 *
 * The DB only stores `model` (and an optional palette override). All derived
 * data — bit depth, mime type, scale factor, rotation, css classes, image
 * size limit, palette colors — comes from the registry at lookup time so we
 * don't drift from upstream.
 */

import { findModel, findPalette } from "./registry";
import {
	DEFAULT_MODEL_NAME,
	type DeviceProfile,
	type TrmnlModel,
} from "./types";

export { DEFAULT_MODEL_NAME, type DeviceProfile };

/**
 * Minimal TrmnlModel used when the registry lookup fails entirely (e.g. cold
 * start with no bundled snapshot AND no upstream connectivity). Keeps the
 * renderer working in the worst case.
 */
const HARDCODED_FALLBACK_MODEL: TrmnlModel = {
	name: DEFAULT_MODEL_NAME,
	label: "TRMNL OG (fallback)",
	width: 800,
	height: 480,
	colors: 4,
	bit_depth: 2,
	scale_factor: 1,
	rotation: 0,
	mime_type: "image/png",
	offset_x: 0,
	offset_y: 0,
	palette_ids: ["bw", "gray-4"],
};

/**
 * Resolve the render profile for a device.
 *
 * @param modelName     value of `devices.model` (the TRMNL `Model` header)
 * @param paletteOverride value of `devices.palette_id` (optional user override)
 */
export async function getDeviceProfile(
	modelName: string | null | undefined,
	paletteOverride?: string | null,
): Promise<DeviceProfile> {
	const requested = modelName?.trim() || DEFAULT_MODEL_NAME;
	let model = await findModel(requested);
	let fallback = false;

	if (!model && requested !== DEFAULT_MODEL_NAME) {
		model = await findModel(DEFAULT_MODEL_NAME);
		fallback = true;
	}
	if (!model) {
		model = HARDCODED_FALLBACK_MODEL;
		fallback = true;
	}

	const desiredPaletteId =
		paletteOverride?.trim() || model.palette_ids[0] || null;
	const palette = desiredPaletteId ? await findPalette(desiredPaletteId) : null;

	return { model, palette, fallback };
}
