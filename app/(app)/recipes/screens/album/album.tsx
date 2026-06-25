import { z } from "zod";
import { BitmapMarker } from "@/components/bitmap-font/bitmap-marker";
import { screenMetric } from "@/components/trmnl/screen-layout";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { RecipeDefinition } from "@/lib/recipes/types";
import {
	DitheringMethod,
	ditherImageToDataUrl,
	embedImageToDataUrl,
} from "@/lib/render/dither-image";
import {
	createScreenProfile,
	type ScreenProfile,
} from "@/lib/trmnl/screen-profile";
import { PreSatori } from "@/utils/pre-satori";
import {
	ALBUM_CITIES,
	ALBUM_CITY_IDS,
	DEFAULT_ALBUM_CITY_ID,
} from "./album-cities";
import getData, { type AlbumData } from "./getData";

export const paramsSchema = z.object({
	city: z
		.enum(ALBUM_CITY_IDS)
		.default(DEFAULT_ALBUM_CITY_ID)
		.describe("City photo and local time")
		.meta({ title: "City" }),
	imageUrl: z
		.string()
		.default("")
		.describe("Optional custom image URL (overrides the city photo when set)")
		.meta({
			title: "Custom image URL",
			placeholder: "https://example.com/photo.jpg",
		}),
});

export const dataSchema = z.object({
	imageUrl: z.string().default(""),
	timezone: z.string().default("Europe/London"),
	cityLabel: z.string().default("London"),
	clockTime: z.string().default("--:--"),
	locationLabel: z.string().default("London"),
	embeddedImageUrl: z.string().optional(),
	ditheredImageUrl: z.string().optional(),
	message: z.string().optional(),
});

type AlbumProps = Partial<AlbumData> & {
	width?: number;
	height?: number;
	screen?: ScreenProfile;
};

export default function Album({
	width: renderWidth = DEFAULT_IMAGE_WIDTH,
	height: renderHeight = DEFAULT_IMAGE_HEIGHT,
	screen,
	imageUrl: sourceImageUrl = "",
	clockTime = "--:--",
	locationLabel = ALBUM_CITIES.london.label,
	ditheredImageUrl,
	embeddedImageUrl,
	message,
	cityLabel = ALBUM_CITIES.london.label,
}: AlbumProps) {
	const screenProfile =
		screen ?? createScreenProfile({ width: renderWidth, height: renderHeight });
	const imageUrl = ditheredImageUrl || embeddedImageUrl || sourceImageUrl;
	const isDithered = Boolean(ditheredImageUrl);
	const clockSize = screenMetric(
		screenProfile,
		screenProfile.isLarge ? 72 : screenProfile.logicalWidth >= 1024 ? 56 : 48,
	);
	const locationSize = screenMetric(
		screenProfile,
		screenProfile.isLarge ? 56 : screenProfile.logicalWidth >= 1024 ? 44 : 36,
	);

	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
				{imageUrl ? (
					<picture className="w-full h-full absolute inset-0">
						<source srcSet={imageUrl} type="image/png" />
						<img
							src={imageUrl}
							alt={`${cityLabel} album`}
							width={screenProfile.logicalWidth}
							height={screenProfile.logicalHeight}
							className="w-full h-full object-cover"
							style={isDithered ? { imageRendering: "pixelated" } : undefined}
						/>
					</picture>
				) : null}
				{message ? (
					<div className="absolute inset-0 flex items-center justify-center p-8 text-center text-white text-2xl lg:text-3xl">
						{message}
					</div>
				) : null}
				<div className="absolute top-0 right-0 flex flex-col items-end p-4 lg:p-8 2xl:p-10 leading-none">
					<BitmapMarker
						text={clockTime}
						sizePx={clockSize}
						className="text-white"
					/>
					<BitmapMarker
						text={locationLabel}
						sizePx={locationSize}
						className="text-white"
					/>
				</div>
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<
	typeof paramsSchema,
	typeof dataSchema
> = {
	meta: {
		slug: "album",
		title: "Album",
		description: "Live Wikipedia city photos with a local clock.",
		published: true,
		tags: ["bitmap", "text", "configurable", "live-data"],
		author: { name: "Mangle Kuo", github: "ghcpuman902" },
		category: "display-components",
		version: "0.4.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2026-06-25T00:00:00Z",
	},
	paramsSchema,
	dataSchema,
	getData: async (params) => getData(params),
	prepareForDevice: async (data, ctx) => {
		const imageUrl = data.imageUrl;
		if (typeof imageUrl !== "string" || !imageUrl) {
			return data;
		}

		if (ctx.levels === null) {
			const embeddedImageUrl = await embedImageToDataUrl(imageUrl, {
				width: ctx.width,
				height: ctx.height,
			});
			return { ...data, embeddedImageUrl };
		}

		const ditheredImageUrl = await ditherImageToDataUrl(imageUrl, {
			width: ctx.width,
			height: ctx.height,
			levels: ctx.levels,
			method: DitheringMethod.BAYER,
			bayerPatternSize: 8,
		});

		return { ...data, ditheredImageUrl };
	},
	Component: ({ width, height, screen, data }) => (
		<Album {...data} width={width} height={height} screen={screen} />
	),
};
