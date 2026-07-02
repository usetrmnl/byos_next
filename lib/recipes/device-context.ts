import type { RGB } from "@/lib/trmnl/palette-colors";
import {
	getPaletteGrayLevels,
	paletteSupportsColor,
	resolveDeviceRenderTarget,
} from "@/lib/trmnl/palette-colors";
import type { ScreenProfile } from "@/lib/trmnl/screen-profile";
import type { TrmnlPalette } from "@/lib/trmnl/types";
import type { RecipeDeviceContext } from "./types";

type BuildRecipeDeviceContextInput = {
	palette: TrmnlPalette | null | undefined;
	screen: ScreenProfile;
	salt: number;
};

export const buildRecipeDeviceContext = ({
	palette,
	screen,
	salt,
}: BuildRecipeDeviceContextInput): RecipeDeviceContext => {
	const target = resolveDeviceRenderTarget(palette);
	const isColor = paletteSupportsColor(palette);
	const colorPalette: RGB[] | null =
		target.targetPalette && isColor ? target.targetPalette : null;
	const levels = isColor ? null : getPaletteGrayLevels(palette);

	return {
		levels,
		colorPalette,
		width: screen.physicalWidth,
		height: screen.physicalHeight,
		logicalWidth: screen.logicalWidth,
		logicalHeight: screen.logicalHeight,
		pixelRatio: screen.pixelRatio,
		salt,
	};
};
