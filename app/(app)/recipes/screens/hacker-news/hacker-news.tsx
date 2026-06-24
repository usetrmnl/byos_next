import { z } from "zod";
import {
	MIN_SCREEN_BODY_FONT_SIZE,
	screenFontSize,
} from "@/components/trmnl/screen-layout";
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
import getHackerNewsData, { type HackerNewsData } from "./getData";

export const paramsSchema = z.object({
	storyCount: z
		.number()
		.default(6)
		.describe("Number of top stories to show")
		.meta({ title: "Number of stories" }),
	qrTarget: z
		.string()
		.default("article")
		.describe("QR code target: article or comments")
		.meta({ title: "QR target", placeholder: "article" }),
});

export const dataSchema = z.object({
	stories: z
		.array(
			z.object({
				rank: z.number(),
				title: z.string(),
				score: z.number(),
				comments: z.number(),
				by: z.string(),
				domain: z.string(),
				qrPath: z.string(),
				qrSize: z.number(),
			}),
		)
		.default([]),
	updatedLabel: z.string().default(""),
	message: z.string().optional(),
});

interface Story {
	rank: number;
	title: string;
	score: number;
	comments: number;
	by: string;
	domain: string;
	qrPath: string;
	qrSize: number;
}

interface HackerNewsProps {
	stories?: Story[];
	updatedLabel?: string;
	message?: string;
	width?: number;
	height?: number;
	screen?: ScreenProfile;
}

const clip = (s: string, max: number) =>
	s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;

export default function HackerNews({
	stories = [],
	updatedLabel = "",
	message,
	width: renderWidth = DEFAULT_IMAGE_WIDTH,
	height: renderHeight = DEFAULT_IMAGE_HEIGHT,
	screen,
}: HackerNewsProps) {
	const screenProfile =
		screen ?? createScreenProfile({ width: renderWidth, height: renderHeight });
	// This is a coordinate/measurement-driven layout (card heights, QR sizing),
	// so it uses pixel math rather than Tailwind flow. Recipe dimensions are
	// logical screen units, so high-density panels get more room without scaling
	// every measurement from physical pixels.
	const width = screenProfile.logicalWidth;
	const height = screenProfile.logicalHeight;
	const scale = width / DEFAULT_IMAGE_WIDTH;
	const s = (value: number) => Math.round(value * scale);
	const f = (value: number, minimum?: number) =>
		screenFontSize(screenProfile, value, minimum);
	const lineW = Math.max(2, s(2));

	const HEADER = s(30);
	const GAP = s(6);
	const count = Math.max(1, stories.length);

	// Two columns; QR hugs the outer edge of each (left col → left, right col → right).
	const leftCount = Math.ceil(count / 2);
	const left = stories.slice(0, leftCount);
	const right = stories.slice(leftCount);
	const rows = Math.max(1, leftCount);

	const bodyH = height - HEADER;
	const cardH = (bodyH - GAP * (rows + 1)) / rows;
	const qr = Math.min(s(132), Math.max(s(56), Math.floor(cardH) - s(16)));

	const qrBlock = (story: Story) => (
		<div
			style={{
				width: qr,
				height: qr,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#fff",
				flexShrink: 0,
				alignSelf: "center",
			}}
		>
			<svg
				width={qr}
				height={qr}
				viewBox={`0 0 ${story.qrSize} ${story.qrSize}`}
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>QR</title>
				<path d={story.qrPath} fill="#000" />
			</svg>
		</div>
	);

	const card = (story: Story, side: "left" | "right") => (
		<div
			key={story.rank}
			style={{
				flex: 1,
				display: "flex",
				alignItems: "flex-start",
				border: `${lineW}px solid #000`,
				borderRadius: s(10),
				padding: s(6),
				overflow: "hidden",
			}}
		>
			{side === "left" ? qrBlock(story) : null}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start",
					overflow: "hidden",
					padding: `${s(2)}px ${s(10)}px 0`,
				}}
			>
				<div
					className="font-blockKie"
					style={{
						fontSize: f(18, MIN_SCREEN_BODY_FONT_SIZE),
						lineHeight: 1.25,
						overflow: "hidden",
					}}
				>
					{story.rank}. {clip(story.title, 80)}
				</div>
				<div
					className="font-blockKie"
					style={{
						fontSize: f(16, MIN_SCREEN_BODY_FONT_SIZE),
						marginTop: s(5),
					}}
				>
					{story.score} pts · {story.comments} comments
				</div>
				<div
					className="font-blockKie"
					style={{ fontSize: f(16, MIN_SCREEN_BODY_FONT_SIZE) }}
				>
					{clip(story.domain, 30)}
				</div>
			</div>
			{side === "right" ? qrBlock(story) : null}
		</div>
	);

	const column = (items: Story[], side: "left" | "right") => (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				gap: GAP,
			}}
		>
			{items.map((story) => card(story, side))}
		</div>
	);

	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<div
				className="bg-white text-black font-blockKie"
				style={{ display: "flex", flexDirection: "column", width, height }}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						height: HEADER,
						alignItems: "center",
						justifyContent: "space-between",
						padding: `0 ${s(12)}px`,
					}}
				>
					<div
						className="font-blockKie"
						style={{ fontSize: f(18, MIN_SCREEN_BODY_FONT_SIZE) }}
					>
						Hacker News
					</div>
					<div
						className="font-blockKie"
						style={{ fontSize: f(16, MIN_SCREEN_BODY_FONT_SIZE) }}
					>
						{message
							? ""
							: `Top ${count}${updatedLabel ? `  ·  ${updatedLabel}` : ""}`}
					</div>
				</div>

				{message ? (
					<div
						className="font-blockKie"
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: f(16, MIN_SCREEN_BODY_FONT_SIZE),
						}}
					>
						{message}
					</div>
				) : (
					<div
						style={{
							display: "flex",
							flex: 1,
							gap: GAP,
							padding: `0 ${GAP}px ${GAP}px`,
						}}
					>
						{column(left, "left")}
						{column(right, "right")}
					</div>
				)}
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<
	typeof paramsSchema,
	typeof dataSchema
> = {
	meta: {
		slug: "hacker-news",
		title: "Hacker News",
		description: "Hacker News top stories with per-story QR codes.",
		published: true,
		tags: ["tailwind", "news", "api", "live-data", "configurable", "qr"],
		author: { name: "mikkel-bergmann", github: "mikkel-bergmann" },
		category: "display-components",
		version: "0.1.0",
		createdAt: "2026-06-14T00:00:00Z",
		updatedAt: "2026-06-14T00:00:00Z",
		renderSettings: { supersample: true },
	},
	paramsSchema,
	dataSchema,
	getData: async (params) => {
		const data = await getHackerNewsData(params);
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, screen, data }) => (
		<HackerNews
			{...(data as HackerNewsData)}
			width={width}
			height={height}
			screen={screen}
		/>
	),
};
