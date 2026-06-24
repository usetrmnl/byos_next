import ftPack from "@/components/bitmap-font/bitmap-font.json";
import blockKiePack from "@/components/bitmap-font/generated/block-kie.json";
import geistPixelSquarePack from "@/components/bitmap-font/generated/geist-pixel-square.json";
import genevaPack from "@/components/bitmap-font/generated/geneva.json";
import type { BuiltInBitmapPack } from "@/lib/font-sources";
import { BUILT_IN_BITMAP_PACKS } from "@/lib/font-sources";
import type { LegacyBitmapFontPack } from "@/lib/bitmap-font/schema/legacy";
import type { NewBitmapFont } from "@/lib/bitmap-font/schema/v2";

export type BitmapFontPackData = LegacyBitmapFontPack | NewBitmapFont;

const PACK_DATA_BY_ID: Record<string, BitmapFontPackData> = {
	ft: ftPack as unknown as BitmapFontPackData,
	geneva: genevaPack as unknown as BitmapFontPackData,
	blockKie: blockKiePack as unknown as BitmapFontPackData,
	geistPixelSquare: geistPixelSquarePack as unknown as BitmapFontPackData,
};

export function getBuiltInPackOptions(): BuiltInBitmapPack[] {
	return BUILT_IN_BITMAP_PACKS;
}

export function loadBuiltInPack(packId: string): BitmapFontPackData | null {
	return PACK_DATA_BY_ID[packId] ?? null;
}

/** Load a built-in pack from disk via API (bypasses bundled JSON cache). */
export async function fetchBuiltInPack(
	packId: string,
): Promise<BitmapFontPackData | null> {
	const response = await fetch(`/api/bitmap-fonts/${packId}`, {
		cache: "no-store",
	});

	if (!response.ok) return null;
	return response.json() as Promise<BitmapFontPackData>;
}
