import type { TrmnlPalette } from "./types";

export const BMP_GRAY_LEVELS_BY_PALETTE = {
	bw: 2,
	"gray-4": 4,
	"gray-16": 16,
	"gray-256": 256,
} as const;

export type BmpGrayLevel =
	(typeof BMP_GRAY_LEVELS_BY_PALETTE)[keyof typeof BMP_GRAY_LEVELS_BY_PALETTE];

export function getBmpGrayLevelsForPalette(
	palette: Pick<TrmnlPalette, "id"> | null | undefined,
): BmpGrayLevel {
	if (!palette) return BMP_GRAY_LEVELS_BY_PALETTE.bw;
	return (
		BMP_GRAY_LEVELS_BY_PALETTE[
			palette.id as keyof typeof BMP_GRAY_LEVELS_BY_PALETTE
		] ?? BMP_GRAY_LEVELS_BY_PALETTE.bw
	);
}
