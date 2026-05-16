import { PreSatori } from "@/utils/pre-satori";
import type { CalendarColumn, CalendarData } from "./getData";

interface IcsCalendarProps extends Partial<CalendarData> {
	width?: number;
	height?: number;
}

function formatTime(isoString: string): string {
	const d = new Date(isoString);
	return d.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function ColumnView({
	column,
	isLast,
	colCount,
}: {
	column: CalendarColumn;
	isLast: boolean;
	colCount: number;
}) {
	const headerSize =
		colCount <= 2 ? "text-xl" : colCount === 3 ? "text-lg" : "text-base";
	const daySize = colCount <= 2 ? "text-sm" : "text-xs";
	const eventTitleSize = colCount <= 2 ? "text-sm" : "text-xs";
	const timeSize = "text-xs";
	const padding = colCount <= 3 ? "p-2" : "p-1";

	return (
		<div
			className={`flex flex-col flex-1 h-full overflow-hidden ${!isLast ? "border-r border-black" : ""}`}
		>
			<div
				className={`border-b border-black ${padding} font-blockkie ${headerSize} truncate leading-tight`}
			>
				{column.name}
			</div>

			<div className={`flex flex-col flex-1 overflow-hidden ${padding} gap-0`}>
				{column.error ? (
					<div className={`${daySize} text-gray-500 mt-1`}>
						Error: {column.error}
					</div>
				) : column.dayGroups.length === 0 ? (
					<div className={`${daySize} text-gray-400 mt-1`}>
						No upcoming events
					</div>
				) : (
					column.dayGroups.map((group) => (
						<div key={group.dateISO} className="mb-1">
							<div
								className={`${daySize} font-bold leading-tight border-b border-gray-300 mb-0.5`}
							>
								{group.dateLabel}
							</div>
							{group.events.map((event, i) => (
								<div
									key={i}
									className="flex flex-row gap-1 leading-tight mb-0.5"
								>
									<span
										className={`${timeSize} text-gray-500 shrink-0 w-12 text-right`}
									>
										{event.allDay ? "all day" : formatTime(event.start)}
									</span>
									<span className={`${eventTitleSize} truncate flex-1`}>
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
	width = 800,
	height = 480,
}: IcsCalendarProps) {
	return (
		<PreSatori width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white text-black">
				<div className="flex flex-row flex-1 overflow-hidden">
					{columns.length === 0 ? (
						<div className="flex items-center justify-center w-full h-full text-gray-400 text-2xl font-blockkie">
							No calendars configured
						</div>
					) : (
						columns.map((col, i) => (
							<ColumnView
								key={i}
								column={col}
								isLast={i === columns.length - 1}
								colCount={columns.length}
							/>
						))
					)}
				</div>

				{fetchedAt && (
					<div className="border-t border-gray-200 px-2 py-0.5 flex flex-row justify-end">
						<span className="text-xs text-gray-400">Updated {fetchedAt}</span>
					</div>
				)}
			</div>
		</PreSatori>
	);
}
