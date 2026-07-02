import { z } from "zod";
import { isBitmapOnlyScreen } from "@/components/trmnl/device-image";
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

interface ResponsiveExampleProps {
	width?: number;
	height?: number;
	screen?: ScreenProfile;
}

export default function ResponsiveExample({
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	screen,
}: ResponsiveExampleProps) {
	const screenProfile = screen ?? createScreenProfile({ width, height });
	const bitmapOnly = isBitmapOnlyScreen(screenProfile);

	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<div className="bg-white flex flex-col w-full h-full text-black">
				<div
					className={
						bitmapOnly
							? "dither-500 flex items-center justify-center text-white font-blockkie py-5 lg:py-8 2xl:py-10 text-2xl sm:text-3xl lg:text-4xl 2xl:text-6xl"
							: "bg-blue-500 flex items-center justify-center text-white font-blockkie py-5 lg:py-8 2xl:py-10 text-2xl sm:text-3xl lg:text-4xl 2xl:text-6xl"
					}
				>
					<p>Responsive Header</p>
				</div>

				<div className="flex-1 flex flex-col md:flex-row gap-1 sm:gap-2 p-1 sm:p-2">
					<div
						className={
							bitmapOnly
								? "dither-700 flex items-center justify-center text-white font-blockkie rounded-sm flex-1 text-lg sm:text-xl lg:text-2xl 2xl:text-4xl"
								: "bg-red-500 flex items-center justify-center text-white font-blockkie rounded-sm flex-1 text-lg sm:text-xl lg:text-2xl 2xl:text-4xl"
						}
					>
						<span className="md:hidden">Top Panel</span>
						<span className="hidden md:inline">Left Panel</span>
					</div>
					<div
						className={
							bitmapOnly
								? "dither-300 flex items-center justify-center text-black font-blockkie rounded-sm border-4 border-black flex-1 text-lg sm:text-xl lg:text-2xl 2xl:text-4xl"
								: "bg-green-500 flex items-center justify-center text-white font-blockkie rounded-sm flex-1 text-lg sm:text-xl lg:text-2xl 2xl:text-4xl"
						}
					>
						<span className="md:hidden">Bottom Panel</span>
						<span className="hidden md:inline">Right Panel</span>
					</div>
				</div>

				<div
					className={
						bitmapOnly
							? "dither-850 flex items-center justify-center text-white font-blockkie h-20 lg:h-28 2xl:h-36 text-base sm:text-xl lg:text-2xl 2xl:text-4xl"
							: "bg-purple-500 flex items-center justify-center text-white font-blockkie h-20 lg:h-28 2xl:h-36 text-base sm:text-xl lg:text-2xl 2xl:text-4xl"
					}
				>
					<p>
						Footer - {screenProfile.logicalWidth}x{screenProfile.logicalHeight}
					</p>
				</div>
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<typeof paramsSchema> = {
	meta: {
		slug: "responsive-example",
		title: "Responsive Example",
		description:
			"Responsive layout demo: Tailwind color fills on color screens, dither-* tone simulation on 1-bit BW.",
		published: true,
		tags: ["tailwind", "responsive", "example"],
		author: { name: "rbouteiller", github: "" },
		category: "display-components",
		version: "0.2.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2026-07-01T00:00:00Z",
	},
	paramsSchema,
	dataSchema,
	Component: ({ width, height, screen }) => (
		<ResponsiveExample width={width} height={height} screen={screen} />
	),
};
