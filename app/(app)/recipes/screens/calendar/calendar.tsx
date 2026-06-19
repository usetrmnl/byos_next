import { z } from "zod";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { RecipeDefinition } from "@/lib/recipes/types";
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
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
}: CalendarProps) {
	const gutter = 40;
	const headerHeight = 54;
	const footerHeight = 22;
	const visibleAllDayItems = allDayItems.slice(0, 3);
	const allDayHeight = visibleAllDayItems.length > 0 ? 48 : 0;
	const colWidth = (width - gutter) / 7;
	const gridWidth = colWidth * 7;
	const bodyHeight = height - headerHeight - allDayHeight - footerHeight;
	const verticalPadding = 14;
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
		<PreSatori width={width} height={height}>
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
								borderLeft: "1px solid #000",
							}}
						>
							<div style={{ fontSize: 13, marginBottom: 2 }}>{day.weekday}</div>
							<div
								className={day.isToday ? "bg-black text-white" : undefined}
								style={{
									width: day.isToday ? 30 : undefined,
									height: day.isToday ? 30 : undefined,
									borderRadius: day.isToday ? 15 : undefined,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: day.isToday ? 18 : 22,
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
								paddingRight: 4,
								fontSize: 12,
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
										width: 1,
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
										left: item.dayIndex * colWidth + 2,
										top: 3 + index * 16,
										width: item.span * colWidth - 4,
										height: 16,
										fontSize: 13,
										paddingLeft: 5,
										display: "flex",
										alignItems: "center",
										overflow: "hidden",
										borderRadius: 2,
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
						borderTop: "1px solid #000",
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
									top: yForMinute(hour * 60) - 9,
									right: 4,
									fontSize: 13,
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
									height: 1,
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
									left: Math.min(index * colWidth, gridWidth - 1),
									top: 0,
									width: 1,
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
									20,
									yForMinute(event.endMin) - top,
								);
								const laneWidth = (colWidth - 3) / event.lanes;
								return (
									<div
										key={`${event.title}-${index}`}
										className="bg-black text-white"
										style={{
											position: "absolute",
											left:
												event.dayIndex * colWidth + 2 + event.lane * laneWidth,
											top,
											width: laneWidth - 1,
											height: eventHeight,
											fontSize: 14,
											lineHeight: 1.12,
											padding: "2px 4px",
											display: "flex",
											flexDirection: "column",
											overflow: "hidden",
											borderRadius: 3,
										}}
									>
										<div style={{ overflow: "hidden" }}>
											{clip(event.title, 26)}
										</div>
										<div style={{ fontSize: 12 }}>{event.timeLabel}</div>
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
						paddingLeft: 8,
						paddingRight: 8,
						fontSize: 13,
						borderTop: "1px solid #000",
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
	Component: ({ width, height, data }) => (
		<Calendar {...(data as CalendarData)} width={width} height={height} />
	),
};
