/**
 * Resolve a fully-described render profile for a device by joining its stored
 * `model` (and optional `palette_id` override) with the local TRMNL registry.
 *
 * The DB only stores `model` (and an optional palette override). All derived
 * data — bit depth, mime type, scale factor, rotation, css classes, image
 * size limit, palette colors — comes from the registry at lookup time so we
 * don't drift from upstream.
 */

import { resolveCompatiblePaletteId } from "./profile-resolution";
import { findModel, findPalette } from "./registry";
import {
	DEFAULT_MODEL_NAME,
	type DeviceProfile,
	type TrmnlModel,
} from "./types";

export { DEFAULT_MODEL_NAME, type DeviceProfile };

/**
 * Firmware-accurate image size budgets.
 *
 * The device firmware (`include/config.h`, `MAX_IMAGE_SIZE`) allocates the
 * receive buffer per board class:
 *   - X-class boards (ESP32-S3 + PSRAM, e.g. TRMNL X): 750000 bytes
 *   - every other board:                                 90000 bytes
 *
 * TRMNL's model registry ships a generic ~92160 default for almost every model
 * (even 2880x2160 panels), so it under-reports the real budget for high-res
 * X-class panels. A 1872x1404 gray-16 screen legitimately exceeds 90KB while
 * still being well within the X's 750KB buffer. Override the known X-class
 * models so our size-limit check reflects what the hardware accepts instead of
 * falsely flagging valid images. Keyed by registry model `name`.
 */
const X_CLASS_IMAGE_SIZE_LIMIT = 750_000;
const X_CLASS_MODEL_NAMES = new Set<string>(["v2"]);

function applyFirmwareImageSizeLimit(model: TrmnlModel): TrmnlModel {
	if (!X_CLASS_MODEL_NAMES.has(model.name)) {
		return model;
	}
	if (model.image_size_limit === X_CLASS_IMAGE_SIZE_LIMIT) {
		return model;
	}
	return { ...model, image_size_limit: X_CLASS_IMAGE_SIZE_LIMIT };
}

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
	model = applyFirmwareImageSizeLimit(model);

	const desiredPaletteId = resolveCompatiblePaletteId(model, paletteOverride);
	const palette = desiredPaletteId ? await findPalette(desiredPaletteId) : null;
	if (desiredPaletteId && !palette) {
		throw new Error(`Unknown TRMNL palette: ${desiredPaletteId}`);
	}

	return { model, palette };
}
