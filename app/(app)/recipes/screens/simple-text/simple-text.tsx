import { z } from "zod";
import fontData from "@/components/bitmap-font/bitmap-font.json";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";

export const paramsSchema = z.object({});
export const dataSchema = paramsSchema;

// Tailwind responsive breakpoints used here: sm≥640, md≥768, lg≥1024, xl≥1280,
// 2xl≥1536. Tuned so the layout stays readable at 800×480 (TRMNL OG) and
// scales up cleanly at 1872×1404 (TRMNL X / e-readers) without scaling
// rasterized bitmap output.
const BITMAP_FONT_SCALE: Record<string, number> = {
	sm: 2,
	md: 2,
	lg: 3,
	xl: 3,
	"2xl": 4,
};

function bitmapFontScaleForWidth(width: number): number {
	if (width >= 1536) return BITMAP_FONT_SCALE["2xl"];
	if (width >= 1280) return BITMAP_FONT_SCALE.xl;
	if (width >= 1024) return BITMAP_FONT_SCALE.lg;
	return 2;
}

export default function SimpleText({
	width = 800,
	height = 480,
}: {
	width?: number;
	height?: number;
}) {
	return (
		<PreSatori useDoubling={true} width={width} height={height}>
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
					scale={bitmapFontScaleForWidth(width)}
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
		renderSettings: { doubleSizeForSharperText: true },
	},
	paramsSchema,
	dataSchema,
	Component: ({ width, height }) => (
		<SimpleText width={width} height={height} />
	),
};
