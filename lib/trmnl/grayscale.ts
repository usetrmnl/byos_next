/**
 * Single source of truth for the grayscale levels TRMNL palettes can declare.
 *
 * `data/trmnl/palettes.json` declares: bw (2), gray-4 (4), gray-16 (16),
 * gray-256 (256). Any consumer that decides "what grayscale level should this
 * device render at" must accept the full set — narrower allow-lists silently
 * downgrade newer 256-level devices to 1-bit.
 */
export const ALL_GRAYSCALE_LEVELS = [2, 4, 16, 256] as const;
export type GrayscaleLevel = (typeof ALL_GRAYSCALE_LEVELS)[number];

const VALID_LEVELS = new Set<number>(ALL_GRAYSCALE_LEVELS);

export function isGrayscaleLevel(value: unknown): value is GrayscaleLevel {
	return typeof value === "number" && VALID_LEVELS.has(value);
}

export function normalizeGrayscale(
	value: number | null | undefined,
): GrayscaleLevel {
	return isGrayscaleLevel(value) ? value : 2;
}
