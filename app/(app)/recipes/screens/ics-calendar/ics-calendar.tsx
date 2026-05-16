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
	colCount,
	fontSize,
}: {
	column: CalendarColumn;
	colCount: number;
	fontSize: string;
}) {
	const { header, body, padding } = getFontClasses(colCount, fontSize);

	return (
		// flex-1 flex flex-col — mirrors responsive-example panel exactly.
		// NO borders: the reset injects border-0 (shorthand) which overrides border-b/border-r
		// (directional) in Takumi's CSS processing. Use bg-black separators instead.
		<div className="flex-1 flex flex-col">
			{/* Dark header bar — same pattern as weather's bg-gray-500 footer (proven to work).
			    bg-black wins over bg-transparent in twMerge (same group, last wins). */}
			<div
				className={`bg-black text-white ${padding} font-blockkie ${header} leading-tight`}
			>
				{column.name}
			</div>

			{/* White content area — flex-1 fills remaining column height */}
			<div className={`flex-1 ${padding}`}>
				{column.error ? (
					<div className={`${body}`}>Error: {column.error}</div>
				) : column.dayGroups.length === 0 ? (
					<div className={`${body}`}>No upcoming events</div>
				) : (
					column.dayGroups.map((group, gi) => (
						// paddingTop via inline style bypasses twMerge entirely —
						// inline styles are preserved by pre-satori and override all class styles.
						// This avoids the m-0 reset shorthand conflicting with mt-* classes.
						<div
							key={group.dateISO}
							style={{ paddingTop: gi > 0 ? "8px" : "0px" }}
						>
							<div className={`${body} font-bold leading-tight`}>
								{group.dateLabel}
							</div>
							{group.events.map((event, i) => (
								<div
									key={i}
									className="flex flex-row leading-tight"
									style={{ paddingTop: "2px" }}
								>
									<span className="text-xs leading-tight">
										{formatTimeRange(event.start, event.end, event.allDay)}
									</span>
									{/* paddingLeft via inline style — avoids gap class cascade issues */}
									<span
										className={`${body} leading-tight`}
										style={{ paddingLeft: "4px" }}
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
			{/* Root: identical to weather.tsx and responsive-example.tsx */}
			<div className="flex flex-col w-full h-full bg-white text-black">
				{/* Columns container: flex-1 first, then direction — matches responsive-example */}
				<div className="flex-1 flex flex-row">
					{columns.length === 0 ? (
						<div className="flex-1 flex items-center justify-center text-2xl font-blockkie">
							No calendars configured
						</div>
					) : (
						columns.map((col, i) => (
							// React.Fragment with key to insert separator between columns
							<div
								key={col.name || i}
								className="flex-1 flex flex-row"
								// flex-row here so the separator + column sit side by side
							>
								{i > 0 && (
									// 1px black column separator using bg-black + inline width.
									// bg-black wins over bg-transparent reset (same twMerge group).
									// flex-row parent's default align-items:stretch makes it full height.
									// NO border CSS — avoids the border-0 reset override bug.
									<div className="bg-black" style={{ width: "1px" }} />
								)}
								<ColumnView
									column={col}
									colCount={columns.length}
									fontSize={fontSize}
								/>
							</div>
						))
					)}
				</div>

				{/* Dark footer bar — same pattern as responsive-example's bg-purple-500 footer */}
				{fetchedAt && (
					<div className="bg-black text-white px-2 py-1 flex flex-row justify-end">
						<span className="text-xs">Updated {fetchedAt}</span>
					</div>
				)}
			</div>
		</PreSatori>
	);
}
