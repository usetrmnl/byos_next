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

	return (
		<div
			className={`flex flex-col flex-1 min-w-0 overflow-hidden${!isLast ? " border-r border-solid border-black" : ""}`}
		>
			<div
				className={`flex-shrink-0 border-b border-solid border-black ${padding} font-blockkie ${header} leading-tight`}
				style={{ overflow: "hidden" }}
			>
				{column.name}
			</div>

			<div className={`flex flex-col flex-1 ${padding}`}>
				{column.error ? (
					<div className={`${body} text-black mt-1`}>Error: {column.error}</div>
				) : column.dayGroups.length === 0 ? (
					<div className={`${body} text-black mt-1`}>No upcoming events</div>
				) : (
					column.dayGroups.map((group) => (
						<div key={group.dateISO} className="flex-shrink-0 mt-2">
							<div className={`${body} font-bold leading-tight mb-1`}>
								{group.dateLabel}
							</div>
							{group.events.map((event, i) => (
								<div key={i} className="flex flex-row gap-1 leading-tight mb-1">
									<span className="text-xs text-black shrink-0 leading-tight">
										{formatTimeRange(event.start, event.end, event.allDay)}
									</span>
									<span
										className={`${body} leading-tight`}
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											flex: 1,
										}}
									>
										{event.title}
									</span>
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
			<div className="flex flex-col w-full h-full bg-white text-black">
				<div className="flex flex-row flex-1 overflow-hidden">
					{columns.length === 0 ? (
						<div className="flex items-center justify-center w-full h-full text-black text-2xl font-blockkie">
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

				{fetchedAt && (
					<div className="flex-shrink-0 border-t border-solid border-black px-2 py-1 flex flex-row justify-end">
						<span className="text-xs text-black">Updated {fetchedAt}</span>
					</div>
				)}
			</div>
		</PreSatori>
	);
}
