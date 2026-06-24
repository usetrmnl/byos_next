import { z } from "zod";
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
export const dataSchema = z.object({
	slug: z.string().optional(),
});

export default function NotFoundScreen({
	slug,
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	screen,
}: {
	slug?: string;
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
			<div className="w-full h-full p-4 sm:p-8 lg:p-16 bg-white flex flex-col items-center justify-center text-black">
				<div className="text-6xl lg:text-8xl 2xl:text-9xl text-center">
					Screen Not Found
				</div>
				{slug && (
					<div className="text-xl lg:text-3xl 2xl:text-5xl mt-4 lg:mt-8 text-center">
						Could not find screen: {slug}
					</div>
				)}
				<div className="text-2xl lg:text-4xl 2xl:text-6xl mt-8 lg:mt-16 text-center">
					Please check your configuration or create this screen.
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
		slug: "not-found",
		title: "Not Found",
		description:
			"System screen for explicitly showing a missing screen message.",
		published: true,
		tags: ["system"],
		author: { name: "Mangle Kuo", github: "ghcpuman902" },
		category: "system",
		version: "0.1.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
		system: true,
	},
	paramsSchema,
	dataSchema,
	Component: ({ width, height, screen, data }) => (
		<NotFoundScreen
			slug={data.slug}
			width={width}
			height={height}
			screen={screen}
		/>
	),
};
