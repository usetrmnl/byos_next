import { z } from "zod";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";

export const paramsSchema = z.object({});
export const dataSchema = z.object({
	slug: z.string().optional(),
});

export default function NotFoundScreen({
	slug,
	width = 800,
	height = 480,
}: {
	slug?: string;
	width?: number;
	height?: number;
}) {
	return (
		<PreSatori width={width} height={height}>
			<div className="w-full h-full p-4 bg-white flex flex-col items-center justify-center text-black">
				<div className="text-6xl text-center">Screen Not Found</div>
				{slug && (
					<div className="text-xl mt-4 text-center">
						Could not find screen: {slug}
					</div>
				)}
				<div className="text-2xl mt-8 text-center">
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
		description: "Fallback screen rendered when a recipe can't be resolved.",
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
	Component: ({ width, height, data }) => (
		<NotFoundScreen slug={data.slug} width={width} height={height} />
	),
};
