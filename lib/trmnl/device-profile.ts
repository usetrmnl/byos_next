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
import { DEFAULT_MODEL_NAME, type DeviceProfile } from "./types";

export { DEFAULT_MODEL_NAME, type DeviceProfile };

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
	if (!model) {
		model = await findModel(DEFAULT_MODEL_NAME);
	}
	if (!model) {
		throw new Error(
			`Unknown TRMNL model: ${requested}; default ${DEFAULT_MODEL_NAME} is unavailable`,
		);
	}

	const desiredPaletteId =
		paletteOverride?.trim() || model.palette_ids[0] || null;
	const palette = desiredPaletteId ? await findPalette(desiredPaletteId) : null;
	if (desiredPaletteId && !palette) {
		throw new Error(`Unknown TRMNL palette: ${desiredPaletteId}`);
	}

	return { model, palette };
}
