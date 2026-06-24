import { z } from "zod";
import { screenFontSize } from "@/components/trmnl/screen-layout";
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
import getCalendarData, { type CalendarData } from "./getData";

export const paramsSchema = z.object({
	icsUrl: z
		.string()
		.default("")
		.describe("One or more iCal (.ics) feed URLs, separated by newlines")
		.meta({
			title: "iCal URL(s)",
			placeholder: "https://calendar.google.com/calendar/ical/.../basic.ics",
		}),
	timezone: z
		.string()
		.default("Australia/Sydney")
		.describe("IANA timezone used to lay out the week")
		.meta({ title: "Timezone", placeholder: "Europe/Paris" }),
	dayStartHour: z.coerce
		.number()
		.default(7)
		.describe("Earliest hour to show")
		.meta({ title: "Day start hour" }),
	dayEndHour: z.coerce
		.number()
		.default(22)
		.describe("Latest hour to show")
		.meta({ title: "Day end hour" }),
});

export const dataSchema = z.object({
	tz: z.string().default("Australia/Sydney"),
	tzLabel: z.string().default(""),
	dayStartHour: z.number().default(7),
	dayEndHour: z.number().default(22),
	hours: z.array(z.number()).default([]),
	days: z
		.array(
			z.object({
				weekday: z.string(),
				dayNum: z.number(),
				isToday: z.boolean(),
			}),
		)
		.default([]),
	allDayItems: z
		.array(
			z.object({
				dayIndex: z.number(),
				span: z.number(),
				title: z.string(),
			}),
		)
		.default([]),
	timedItems: z
		.array(
			z.object({
				dayIndex: z.number(),
				startMin: z.number(),
				endMin: z.number(),
				lane: z.number(),
				lanes: z.number(),
				title: z.string(),
				timeLabel: z.string(),
			}),
		)
		.default([]),
	updatedLabel: z.string().default(""),
	message: z.string().optional(),
});

type CalendarProps = Partial<CalendarData> & {
	width?: number;
	height?: number;
	screen?: ScreenProfile;
};

const clip = (value: string, max: number) =>
	value.length > max ? `${value.slice(0, Math.max(1, max - 1))}…` : value;

const fmtHour = (hour: number) => {
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}${hour < 12 ? "a" : "p"}`;
};

export default function Calendar({
	days = [],
	hours = [],
	allDayItems = [],
	timedItems = [],
	dayStartHour = 7,
	dayEndHour = 22,
	tzLabel = "",
	updatedLabel = "",
	message,
	width: renderWidth = DEFAULT_IMAGE_WIDTH,
	height: renderHeight = DEFAULT_IMAGE_HEIGHT,
	screen,
}: CalendarProps) {
	const screenProfile =
		screen ?? createScreenProfile({ width: renderWidth, height: renderHeight });
	// The grid is coordinate-positioned (event top = time→y, left = day*colWidth),
	// so it is inherently measurement-based rather than Tailwind/flow layout.
	// Recipe dimensions are logical screen units, so TRMNL X scales from 1040px
	// logical width instead of its 1872px physical output.
	const width = screenProfile.logicalWidth;
	const height = screenProfile.logicalHeight;
	const scale = width / DEFAULT_IMAGE_WIDTH;
	const s = (value: number) => Math.round(value * scale);
	const f = (value: number) => screenFontSize(screenProfile, value);
	const lineW = Math.max(1, Math.round(scale));

	const gutter = s(40);
	const headerHeight = s(54);
	const footerHeight = s(22);
	const visibleAllDayItems = allDayItems.slice(0, 3);
	const allDayHeight = visibleAllDayItems.length > 0 ? s(48) : 0;
	const colWidth = (width - gutter) / 7;
	const gridWidth = colWidth * 7;
	const bodyHeight = height - headerHeight - allDayHeight - footerHeight;
	const verticalPadding = s(14);
	const visibleMinutes = Math.max(1, (dayEndHour - dayStartHour) * 60);
	const yForMinute = (minute: number) => {
		const min = Math.min(Math.max(minute, dayStartHour * 60), dayEndHour * 60);
		return (
			verticalPadding +
			((min - dayStartHour * 60) / visibleMinutes) *
				(bodyHeight - 2 * verticalPadding)
		);
	};
	const footer = message
		? message
		: [tzLabel, updatedLabel && `Updated ${updatedLabel}`]
				.filter(Boolean)
				.join(" · ");

	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<div
				className="bg-white text-black"
				style={{ display: "flex", flexDirection: "column", width, height }}
			>
				<div style={{ display: "flex", height: headerHeight }}>
					<div style={{ width: gutter }} />
					{days.map((day, index) => (
						<div
							key={`${day.weekday}-${index}`}
							style={{
								width: colWidth,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								borderLeft: `${lineW}px solid #000`,
							}}
						>
							<div style={{ fontSize: f(13), marginBottom: s(2) }}>
								{day.weekday}
							</div>
							<div
								className={day.isToday ? "bg-black text-white" : undefined}
								style={{
									width: day.isToday ? s(30) : undefined,
									height: day.isToday ? s(30) : undefined,
									borderRadius: day.isToday ? s(15) : undefined,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: day.isToday ? f(18) : f(22),
								}}
							>
								{day.dayNum}
							</div>
						</div>
					))}
				</div>

				{allDayHeight > 0 && (
					<div style={{ display: "flex", height: allDayHeight }}>
						<div
							style={{
								width: gutter,
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-end",
								paddingRight: s(4),
								fontSize: f(12),
							}}
						>
							all-day
						</div>
						<div
							style={{
								position: "relative",
								width: gridWidth,
								height: allDayHeight,
							}}
						>
							{days.map((_, index) => (
								<div
									key={`all-day-col-${index}`}
									className="bg-black"
									style={{
										position: "absolute",
										left: index * colWidth,
										top: 0,
										width: lineW,
										height: allDayHeight,
									}}
								/>
							))}
							{visibleAllDayItems.map((item, index) => (
								<div
									key={`${item.title}-${index}`}
									className="bg-black text-white"
									style={{
										position: "absolute",
										left: item.dayIndex * colWidth + s(2),
										top: s(3) + index * s(16),
										width: item.span * colWidth - s(4),
										height: s(16),
										fontSize: f(13),
										paddingLeft: s(5),
										display: "flex",
										alignItems: "center",
										overflow: "hidden",
										borderRadius: s(2),
									}}
								>
									{clip(item.title, Math.round(item.span * 13))}
								</div>
							))}
						</div>
					</div>
				)}

				<div
					style={{
						display: "flex",
						height: bodyHeight,
						borderTop: `${lineW}px solid #000`,
					}}
				>
					<div
						style={{ width: gutter, position: "relative", height: bodyHeight }}
					>
						{hours.map((hour) => (
							<div
								key={hour}
								style={{
									position: "absolute",
									top: yForMinute(hour * 60) - s(9),
									right: s(4),
									fontSize: f(13),
								}}
							>
								{fmtHour(hour)}
							</div>
						))}
					</div>
					<div
						style={{
							position: "relative",
							width: gridWidth,
							height: bodyHeight,
						}}
					>
						{hours.map((hour) => (
							<div
								key={`hour-${hour}`}
								className="bg-black"
								style={{
									position: "absolute",
									left: 0,
									top: yForMinute(hour * 60),
									width: gridWidth,
									height: lineW,
									opacity: 0.25,
								}}
							/>
						))}
						{Array.from({ length: 8 }).map((_, index) => (
							<div
								key={`col-${index}`}
								className="bg-black"
								style={{
									position: "absolute",
									left: Math.min(index * colWidth, gridWidth - lineW),
									top: 0,
									width: lineW,
									height: bodyHeight,
								}}
							/>
						))}
						{timedItems
							.filter(
								(event) =>
									event.endMin > dayStartHour * 60 &&
									event.startMin < dayEndHour * 60,
							)
							.map((event, index) => {
								const top = yForMinute(event.startMin);
								const eventHeight = Math.max(
									s(20),
									yForMinute(event.endMin) - top,
								);
								const laneWidth = (colWidth - s(3)) / event.lanes;
								return (
									<div
										key={`${event.title}-${index}`}
										className="bg-black text-white"
										style={{
											position: "absolute",
											left:
												event.dayIndex * colWidth +
												s(2) +
												event.lane * laneWidth,
											top,
											width: laneWidth - lineW,
											height: eventHeight,
											fontSize: f(14),
											lineHeight: 1.12,
											padding: `${s(2)}px ${s(4)}px`,
											display: "flex",
											flexDirection: "column",
											overflow: "hidden",
											borderRadius: s(3),
										}}
									>
										<div style={{ overflow: "hidden" }}>
											{clip(event.title, 26)}
										</div>
										<div style={{ fontSize: f(12) }}>{event.timeLabel}</div>
									</div>
								);
							})}
					</div>
				</div>

				<div
					style={{
						height: footerHeight,
						display: "flex",
						alignItems: "center",
						justifyContent: message ? "center" : "flex-end",
						paddingLeft: s(8),
						paddingRight: s(8),
						fontSize: f(13),
						borderTop: `${lineW}px solid #000`,
					}}
				>
					{footer}
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
		slug: "calendar",
		title: "Calendar",
		description: "Weekly calendar grid from one or more iCal (.ics) feeds.",
		published: true,
		tags: ["tailwind", "calendar", "api", "live-data", "configurable"],
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
		const data = await getCalendarData(params);
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, screen, data }) => (
		<Calendar
			{...(data as CalendarData)}
			width={width}
			height={height}
			screen={screen}
		/>
	),
};
