import { z } from "zod";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";

const DEFAULT_IMAGE_URL = "https://byos-nextjs.vercel.app/album/london.png";

export const paramsSchema = z.object({
	imageUrl: z
		.string()
		.url()
		.default(DEFAULT_IMAGE_URL)
		.describe("URL of the image to display in the album")
		.meta({ title: "Image URL", placeholder: "https://example.com/image.png" }),
});
export const dataSchema = paramsSchema;

interface AlbumProps {
	width?: number;
	height?: number;
	params?: {
		imageUrl?: string;
	};
}

export default async function Album({
	width = 800,
	height = 480,
	params,
}: AlbumProps) {
	const imageUrl = params?.imageUrl || DEFAULT_IMAGE_URL;

	return (
		<PreSatori width={width} height={height}>
			<div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
				<picture className="w-full h-full absolute inset-0">
					<source srcSet={imageUrl} type="image/png" />
					<img
						src={imageUrl}
						alt="Album"
						width={width}
						height={height}
						className="w-full h-full object-cover"
						style={{ imageRendering: "pixelated" }}
					/>
				</picture>
				<div className="text-[60px] text-white absolute top-0 right-0 p-4 flex flex-col items-end leading-none">
					<span className="">
						{new Date().toLocaleTimeString("en-GB", {
							timeZone: "Europe/London",
							hour12: true,
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
					<span className="">
						London{" "}
						{new Date()
							.toLocaleString("en-GB", {
								timeZone: "Europe/London",
								timeZoneName: "short",
							})
							.split(" ")
							.pop()}
					</span>
				</div>
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<typeof paramsSchema> = {
	meta: {
		slug: "album",
		title: "Album",
		description: "Photos with a clock.",
		published: true,
		tags: ["bitmap", "text", "configurable"],
		author: { name: "Mangle Kuo", github: "ghcpuman902" },
		category: "display-components",
		version: "0.2.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
	},
	paramsSchema,
	dataSchema,
	Component: ({ width, height, params }) => (
		<Album width={width} height={height} params={params} />
	),
};
