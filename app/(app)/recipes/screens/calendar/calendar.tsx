import { PreSatori } from "@/utils/pre-satori";

interface DayHeader {
	label: string;
	isToday: boolean;
}
interface AllDayItem {
	dayIndex: number;
	span: number;
	title: string;
}
interface TimedItem {
	dayIndex: number;
	topPct: number;
	heightPct: number;
	title: string;
	timeLabel: string;
}

interface CalendarProps {
	days?: DayHeader[];
	hours?: number[];
	allDayItems?: AllDayItem[];
	timedItems?: TimedItem[];
	dayStartHour?: number;
	dayEndHour?: number;
	updatedLabel?: string;
	message?: string;
	width?: number;
	height?: number;
}

const clip = (s: string, max: number) =>
	s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;

const fmtHour = (h: number) => {
	const ap = h < 12 ? "a" : "p";
	const hh = h % 12 === 0 ? 12 : h % 12;
	return `${hh}${ap}`;
};

export default function Calendar({
	days = [],
	hours = [],
	allDayItems = [],
	timedItems = [],
	dayStartHour = 7,
	dayEndHour = 22,
	updatedLabel = "",
	message,
	width = 800,
	height = 480,
}: CalendarProps) {
	const GUT = 50;
	const HEADER = 32;
	const ALLDAY = allDayItems.length ? 46 : 0;
	const FOOTER = 20;
	const PAD = 14; // vertical inset so first/last hour clears the borders
	const colW = (width - GUT) / 7;
	const gridW = colW * 7;
	const bodyH = height - HEADER - ALLDAY - FOOTER;
	const usableH = bodyH - 2 * PAD;
	const range = Math.max(1, dayEndHour - dayStartHour);
	const y = (h: number) => PAD + ((h - dayStartHour) / range) * usableH;

	return (
		<PreSatori width={width} height={height}>
			<div
				className="bg-white text-black"
				style={{ display: "flex", flexDirection: "column", width, height }}
			>
				{/* Day header */}
				<div style={{ display: "flex", height: HEADER }}>
					<div style={{ width: GUT }} />
					{days.map((d, i) => (
						<div
							key={i}
							className={d.isToday ? "bg-black text-white" : "text-black"}
							style={{
								width: colW,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 17,
								borderLeft: "1px solid #000",
							}}
						>
							{d.label}
						</div>
					))}
				</div>

				{/* All-day band */}
				{ALLDAY > 0 && (
					<div style={{ display: "flex", height: ALLDAY }}>
						<div
							style={{
								width: GUT,
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-end",
								paddingRight: 5,
								fontSize: 11,
							}}
						>
							all-day
						</div>
						<div style={{ position: "relative", width: gridW, height: ALLDAY }}>
							{days.map((_, i) => (
								<div
									key={i}
									className="bg-black"
									style={{ position: "absolute", left: i * colW, top: 0, width: 1, height: ALLDAY }}
								/>
							))}
							{allDayItems.map((a, i) => (
								<div
									key={i}
									className="bg-black text-white"
									style={{
										position: "absolute",
										left: a.dayIndex * colW + 2,
										top: 3 + (i % 3) * 15,
										width: a.span * colW - 4,
										height: 14,
										fontSize: 11,
										paddingLeft: 4,
										display: "flex",
										alignItems: "center",
										overflow: "hidden",
										borderRadius: 2,
									}}
								>
									{clip(a.title, Math.round(a.span * 13))}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Body: time gutter + day grid */}
				<div style={{ display: "flex", height: bodyH, borderTop: "1px solid #000" }}>
					<div style={{ width: GUT, position: "relative", height: bodyH }}>
						{hours.map((h) => (
							<div
								key={h}
								style={{
									position: "absolute",
									top: y(h) - 8,
									right: 5,
									fontSize: 12,
								}}
							>
								{fmtHour(h)}
							</div>
						))}
					</div>
					<div style={{ position: "relative", width: gridW, height: bodyH }}>
						{/* Hour gridlines */}
						{hours.map((h) => (
							<div
								key={`l${h}`}
								className="bg-black"
								style={{ position: "absolute", left: 0, top: y(h), width: gridW, height: 1, opacity: 0.25 }}
							/>
						))}
						{/* Column separators */}
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={`c${i}`}
								className="bg-black"
								style={{ position: "absolute", left: Math.min(i * colW, gridW - 1), top: 0, width: 1, height: bodyH }}
							/>
						))}
						{/* Timed events */}
						{timedItems.map((e, i) => {
							const top = PAD + e.topPct * usableH;
							const h = Math.min(
								bodyH - PAD - top,
								Math.max(16, e.heightPct * usableH),
							);
							return (
								<div
									key={i}
									className="bg-black text-white"
									style={{
										position: "absolute",
										left: e.dayIndex * colW + 2,
										top,
										width: colW - 4,
										height: h,
										fontSize: 12,
										padding: "1px 4px",
										display: "flex",
										flexDirection: "column",
										overflow: "hidden",
										borderRadius: 2,
									}}
								>
									<div style={{ fontSize: 10, lineHeight: 1.1 }}>{e.timeLabel}</div>
									<div style={{ lineHeight: 1.1 }}>{clip(e.title, 14)}</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						height: FOOTER,
						display: "flex",
						alignItems: "center",
						justifyContent: message ? "center" : "flex-end",
						paddingLeft: 8,
						paddingRight: 8,
						fontSize: 11,
						borderTop: "1px solid #000",
					}}
				>
					{message ? message : updatedLabel ? `Updated ${updatedLabel}` : ""}
				</div>
			</div>
		</PreSatori>
	);
}
