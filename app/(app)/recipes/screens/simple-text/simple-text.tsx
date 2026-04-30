import { z } from "zod";
import fontData from "@/components/bitmap-font/bitmap-font.json";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";

export const paramsSchema = z.object({});
export const dataSchema = paramsSchema;

export default function SimpleText({
	width = 800,
	height = 480,
}: {
	width?: number;
	height?: number;
}) {
	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="w-full h-full p-4 bg-white flex flex-col items-center justify-center text-center text-black">
				<div className="text-4xl font-blockkie">
					Hello World - blockkie font
				</div>
				<div className="text-base font-geneva9">
					small text with geneva9 font
				</div>
				<div className="text-3xl font-inter">
					Hello World - inter font not anti-aliased
				</div>
				<div className="text-3xl font-blockkie leading-none tracking-tight">
					Hello World - leading none tracking tight
				</div>
				<div className="text-3xl font-blockkie leading-loose tracking-wider">
					Hello World - leading loose tracking wider
				</div>
				<BitmapText
					text={`FT font: Great for headlines`}
					fontData={fontData}
					gridSize={`8x16`}
					scale={2}
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
