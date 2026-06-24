/**
 * TRMNL device + palette types.
 *
 * The Zod schemas are the single source of truth: the types below are inferred
 * from them, and the registry validates upstream/snapshot data against them at
 * the boundary (see `lib/trmnl/registry.ts`). This is a pure schema + type
 * module — safe to import from client components (no server-only runtime).
 */

import { z } from "zod";

export type RegistryResource = "models" | "palettes" | "categories" | "ips";

/** Default model name when none is supplied by the device. */
export const DEFAULT_MODEL_NAME = "og_plus";

export const trmnlModelSchema = z.object({
	name: z.string(),
	label: z.string(),
	description: z.string().optional(),
	width: z.number(),
	height: z.number(),
	colors: z.number(),
	bit_depth: z.number(),
	scale_factor: z.number(),
	rotation: z.number(),
	mime_type: z.string(),
	offset_x: z.number(),
	offset_y: z.number(),
	kind: z.string().optional(),
	palette_ids: z.array(z.string()),
	preview_white_point: z.string().optional(),
	image_size_limit: z.number().optional(),
	image_upload_supported: z.boolean().optional(),
	// `css` is nullable in the upstream API.
	css: z
		.object({
			classes: z.record(z.string(), z.string()).optional(),
			// Ships as either `[name, value]` tuples or a plain object; both are
			// normalised defensively by `model-css.ts` / `screen-profile.ts`, so
			// we keep it lenient here to avoid false-dropping otherwise-valid models.
			variables: z.unknown().optional(),
		})
		.nullish(),
});

const trmnlPaletteBaseSchema = z.object({
	id: z.string(),
	name: z.string(),
	framework_class: z.string().optional(),
	// `grays`, `colors` and `grayscale_bit_depth` are nullable in the upstream
	// API (null for the palette family they don't apply to), hence `.nullish()`.
	grays: z.number().nullish(),
	/**
	 * Hex color list for discrete-color palettes (color-3bwr, color-6a, …).
	 * Null/absent for grayscale palettes (bw, gray-4, …) and the continuous
	 * palettes color-12bit / color-24bit.
	 */
	colors: z.array(z.string()).nullish(),
	grayscale_bit_depth: z.number().nullish(),
	/**
	 * NOT part of the upstream TRMNL API payload (the spec only exposes
	 * `grayscale_bit_depth`). The renderer's per-channel quantization path in
	 * `lib/render/device-image.ts` anticipates it for continuous-color panels;
	 * since the live API can't distinguish 12-bit from 24-bit, this stays an
	 * optional client-side extension rather than a validated API field.
	 */
	channel_bit_depth: z.number().optional(),
});

export const trmnlPaletteSchema = trmnlPaletteBaseSchema.transform(
	(palette) => {
		const channelBitDepth =
			palette.id === "color-12bit"
				? 4
				: palette.id === "color-24bit"
					? 8
					: null;
		if (!channelBitDepth) return palette;
		return {
			...palette,
			grays: null,
			colors: null,
			channel_bit_depth: channelBitDepth,
		};
	},
);

export type TrmnlModel = z.infer<typeof trmnlModelSchema>;
export type TrmnlPalette = z.infer<typeof trmnlPaletteSchema>;

export type DeviceProfile = {
	model: TrmnlModel;
	palette: TrmnlPalette | null;
};
