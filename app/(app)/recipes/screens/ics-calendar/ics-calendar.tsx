import { PreSatori } from "@/utils/pre-satori";
import type { CalendarColumn, CalendarData } from "./getData";

interface IcsCalendarProps extends Partial<CalendarData> {
	width?: number;
	height?: number;
}

function formatTime(isoString: string): string {
	return new Date(isoString).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function formatTimeRange(
	startISO: string,
	endISO: string,
	allDay: boolean,
): string {
	if (allDay) return "all day";
	if (!endISO || startISO === endISO) return formatTime(startISO);
	const startStr = formatTime(startISO);
	const endStr = formatTime(endISO);
	return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

// Legibility floor: text-xs (12px) on 800×480 e-ink.
function getFontClasses(
	colCount: number,
	fontSize: string,
): { header: string; body: string; padding: string } {
	if (fontSize === "large") {
		if (colCount <= 2)
			return { header: "text-2xl", body: "text-base", padding: "p-2" };
		if (colCount === 3)
			return { header: "text-xl", body: "text-sm", padding: "p-2" };
		return { header: "text-lg", body: "text-xs", padding: "p-1" };
	}
	if (fontSize === "small") {
		if (colCount <= 2)
			return { header: "text-lg", body: "text-sm", padding: "p-2" };
		if (colCount === 3)
			return { header: "text-base", body: "text-xs", padding: "p-1" };
		return { header: "text-sm", body: "text-xs", padding: "p-1" };
	}
	// medium (default)
	if (colCount <= 2)
		return { header: "text-xl", body: "text-sm", padding: "p-2" };
	if (colCount === 3)
		return { header: "text-lg", body: "text-xs", padding: "p-2" };
	return { header: "text-base", body: "text-xs", padding: "p-1" };
}

function ColumnView({
	column,
	isLast,
	colCount,
	fontSize,
}: {
	column: CalendarColumn;
	isLast: boolean;
	colCount: number;
	fontSize: string;
}) {
	const { header, body, padding } = getFontClasses(colCount, fontSize);

	// Pattern: exactly mirrors responsive-example panel — "flex-1 flex flex-col"
	// NO overflow-hidden, NO min-w-0, NO flex-shrink-0 (absent from all working recipes)
	return (
		<div
			className={`flex-1 flex flex-col${!isLast ? " border-r border-solid border-black" : ""}`}
		>
			{/* Header: natural height from padding, like weather's header divs */}
			<div
				className={`border-b border-solid border-black ${padding} font-blockkie ${header} leading-tight`}
			>
				{column.name}
			</div>

			{/* Content: flex-1 fills remaining column height */}
			<div className={`flex-1 ${padding}`}>
				{column.error ? (
					<div className={`${body} mt-1`}>Error: {column.error}</div>
				) : column.dayGroups.length === 0 ? (
					<div className={`${body} mt-1`}>No upcoming events</div>
				) : (
					column.dayGroups.map((group) => (
						<div key={group.dateISO} className="mt-2">
							<div className={`${body} font-bold leading-tight mb-1`}>
								{group.dateLabel}
							</div>
							{group.events.map((event, i) => (
								<div key={i} className="flex flex-row gap-1 leading-tight mb-1">
									<span className="text-xs leading-tight">
										{formatTimeRange(event.start, event.end, event.allDay)}
									</span>
									<span className={`${body} leading-tight`}>{event.title}</span>
								</div>
							))}
						</div>
					))
				)}
			</div>
		</div>
	);
}

export default function IcsCalendar({
	columns = [],
	fetchedAt = "",
	fontSize = "medium",
	width = 800,
	height = 480,
}: IcsCalendarProps) {
	return (
		<PreSatori width={width} height={height}>
			{/* Root: identical to weather.tsx and responsive-example.tsx */}
			<div className="flex flex-col w-full h-full bg-white text-black">
				{/* Columns container: mirrors responsive-example "flex-1 flex flex-col md:flex-row"
				    fixed to flex-row — dimensions are known, no responsive needed */}
				<div className="flex-1 flex flex-row">
					{columns.length === 0 ? (
						<div className="flex-1 flex items-center justify-center text-2xl font-blockkie">
							No calendars configured
						</div>
					) : (
						columns.map((col, i) => (
							<ColumnView
								key={i}
								column={col}
								isLast={i === columns.length - 1}
								colCount={columns.length}
								fontSize={fontSize}
							/>
						))
					)}
				</div>

				{/* Footer: explicit padding like responsive-example "h-20", NOT flex-shrink-0 */}
				{fetchedAt && (
					<div className="border-t border-solid border-black px-2 py-1 flex flex-row justify-end">
						<span className="text-xs">Updated {fetchedAt}</span>
					</div>
				)}
			</div>
		</PreSatori>
	);
}
