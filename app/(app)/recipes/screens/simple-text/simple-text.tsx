import { z } from "zod";
import fontData from "@/components/bitmap-font/bitmap-font.json";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { RecipeDefinition } from "@/lib/recipes/types";
import {
	createScreenProfile,
	type ScreenProfile,
} from "@/lib/trmnl/screen-profile";
import { PreSatori } from "@/utils/pre-satori";

export const paramsSchema = z.object({});
export const dataSchema = paramsSchema;

// Bitmap fonts need integer scale factors, so derive the raster scale from the
// logical screen tier instead of physical output pixels.
const BITMAP_FONT_SCALE: Record<string, number> = {
	sm: 2,
	md: 2,
	lg: 3,
	xl: 3,
	"2xl": 4,
};

function bitmapFontScaleForScreen(screen: ScreenProfile): number {
	if (screen.isLarge) return BITMAP_FONT_SCALE["2xl"];
	if (screen.logicalWidth >= 1024) return BITMAP_FONT_SCALE.lg;
	return 2;
}

export default function SimpleText({
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	screen,
}: {
	width?: number;
	height?: number;
	screen?: ScreenProfile;
}) {
	const screenProfile = screen ?? createScreenProfile({ width, height });
	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<div className="w-full h-full p-4 sm:p-6 lg:p-12 2xl:p-20 bg-white flex flex-col items-center justify-center gap-2 lg:gap-4 2xl:gap-6 text-center text-black">
				<div className="text-4xl lg:text-6xl 2xl:text-8xl font-blockkie">
					Hello World - blockkie font
				</div>
				<div className="text-base lg:text-2xl 2xl:text-4xl font-geneva9">
					small text with geneva9 font
				</div>
				<div className="text-3xl lg:text-5xl 2xl:text-7xl font-inter">
					Hello World - inter font not anti-aliased
				</div>
				<div className="text-3xl lg:text-5xl 2xl:text-7xl font-blockkie leading-none tracking-tight">
					Hello World - leading none tracking tight
				</div>
				<div className="text-3xl lg:text-5xl 2xl:text-7xl font-blockkie leading-loose tracking-wider">
					Hello World - leading loose tracking wider
				</div>
				<BitmapText
					text={`FT font: Great for headlines`}
					fontData={fontData}
					gridSize={`8x16`}
					scale={bitmapFontScaleForScreen(screenProfile)}
					gap={0}
				/>
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<typeof paramsSchema> = {
	meta: {
		slug: "simple-text",
		title: "Simple Text",
		description: "A simple text component.",
		published: true,
		tags: ["bitmap", "text"],
		author: { name: "Mangle Kuo", github: "ghcpuman902" },
		category: "display-components",
		version: "0.1.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
		renderSettings: { supersample: true },
	},
	paramsSchema,
	dataSchema,
	Component: ({ width, height, screen }) => (
		<SimpleText width={width} height={height} screen={screen} />
	),
};
