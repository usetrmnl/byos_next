import IcalExpander from "ical-expander";

// Live calendar data — always fetch fresh.
export const dynamic = "force-dynamic";

type CalendarParams = {
	icsUrl?: string;
	dayStartHour?: number | string;
	dayEndHour?: number | string;
	timezone?: string;
};

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

export interface CalendarData {
	tz: string;
	dayStartHour: number;
	dayEndHour: number;
	hours: number[];
	days: DayHeader[];
	allDayItems: AllDayItem[];
	timedItems: TimedItem[];
	updatedLabel: string;
	message?: string;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Wall-clock parts of an instant in a given IANA timezone.
function tzParts(date: Date, tz: string) {
	const f = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const p: Record<string, string> = {};
	for (const part of f.formatToParts(date)) p[part.type] = part.value;
	const hour = Number(p.hour) % 24;
	return {
		year: Number(p.year),
		month: Number(p.month),
		day: Number(p.day),
		hour,
		minute: Number(p.minute),
		ymd: `${p.year}-${p.month}-${p.day}`,
		minutes: hour * 60 + Number(p.minute),
	};
}

function toHour(v: unknown, def: number): number {
	const n = typeof v === "number" ? v : Number(v);
	if (!Number.isFinite(n)) return def;
	return Math.min(23, Math.max(0, Math.round(n)));
}

function fmtHM(h: number, m: number): string {
	const ap = h < 12 ? "a" : "p";
	const hh = h % 12 === 0 ? 12 : h % 12;
	return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, "0")}${ap}`;
}

async function fetchIcs(url: string): Promise<string | null> {
	if (!/^https?:\/\//i.test(url)) return null;
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 7000);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: { Accept: "text/calendar" },
		});
		return res.ok ? await res.text() : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

export default async function getData(
	params?: CalendarParams,
): Promise<CalendarData> {
	const tz = params?.timezone?.trim() || "Australia/Sydney";
	const dayStartHour = toHour(params?.dayStartHour, 7);
	const dayEndHour = Math.max(dayStartHour + 1, toHour(params?.dayEndHour, 22));
	const hours: number[] = [];
	for (let h = dayStartHour; h <= dayEndHour; h++) hours.push(h);

	const now = new Date();
	const today = tzParts(now, tz);
	// Anchor at 12:00 UTC of today's local date; adding whole days stays near
	// midday so day labels stay correct across DST transitions.
	const anchor = Date.UTC(today.year, today.month - 1, today.day, 12);

	const days: DayHeader[] = [];
	const dayKeys: string[] = [];
	for (let i = 0; i < 7; i++) {
		const p = tzParts(new Date(anchor + i * DAY_MS), tz);
		dayKeys.push(p.ymd);
		const wd = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
		days.push({ label: `${wd} ${p.month}/${p.day}`, isToday: i === 0 });
	}

	const updatedLabel = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(now);

	const base: CalendarData = {
		tz,
		dayStartHour,
		dayEndHour,
		hours,
		days,
		allDayItems: [],
		timedItems: [],
		updatedLabel,
	};

	const urls = (params?.icsUrl || "")
		.split(/[\n,]+/)
		.map((u) => u.trim())
		.filter(Boolean);
	if (urls.length === 0) {
		return {
			...base,
			message: "Add your calendar's secret iCal (.ics) URL in settings.",
		};
	}

	const winStart = new Date(anchor - DAY_MS);
	const winEnd = new Date(anchor + 7 * DAY_MS);
	const winStartMin = dayStartHour * 60;
	const winEndMin = dayEndHour * 60;
	const span = winEndMin - winStartMin;

	const allDayItems: AllDayItem[] = [];
	const timedItems: TimedItem[] = [];

	const texts = await Promise.allSettled(urls.map(fetchIcs));
	for (const result of texts) {
		if (result.status !== "fulfilled" || !result.value) continue;
		let parsed: { events: unknown[]; occurrences: unknown[] };
		try {
			const exp = new IcalExpander({ ics: result.value, maxIterations: 2000 });
			parsed = exp.between(winStart, winEnd);
		} catch {
			continue;
		}

		type Raw = { start: { toJSDate(): Date; isDate: boolean }; end: { toJSDate(): Date }; summary: string };
		const raw: Raw[] = [
			...(parsed.events as { startDate: Raw["start"]; endDate: Raw["end"]; summary: string }[]).map(
				(e) => ({ start: e.startDate, end: e.endDate, summary: e.summary }),
			),
			...(parsed.occurrences as { startDate: Raw["start"]; endDate: Raw["end"]; item: { summary: string } }[]).map(
				(o) => ({ start: o.startDate, end: o.endDate, summary: o.item.summary }),
			),
		];

		for (const ev of raw) {
			const title = (ev.summary || "(busy)").toString().replace(/\s+/g, " ").trim();
			const start = ev.start.toJSDate();
			const end = ev.end.toJSDate();
			const durationMs = end.getTime() - start.getTime();
			const sp = tzParts(start, tz);
			const startIdx = dayKeys.indexOf(sp.ymd);

			// All-day or multi-day events go in the all-day band.
			if (ev.start.isDate || durationMs >= 20 * 3600 * 1000) {
				const from = startIdx >= 0 ? startIdx : 0;
				const dayCount = Math.max(1, Math.round(durationMs / DAY_MS));
				const to = Math.min(6, from + dayCount - 1);
				if (to < 0 || from > 6) continue;
				allDayItems.push({ dayIndex: from, span: to - from + 1, title });
				continue;
			}

			if (startIdx < 0) continue;
			const ep = tzParts(end, tz);
			const startMin = sp.minutes;
			const endMin = ep.ymd === sp.ymd ? ep.minutes : 24 * 60;
			if (endMin <= winStartMin || startMin >= winEndMin) continue; // outside visible hours

			const top = (Math.max(startMin, winStartMin) - winStartMin) / span;
			const bottom = (Math.min(endMin, winEndMin) - winStartMin) / span;
			timedItems.push({
				dayIndex: startIdx,
				topPct: Math.max(0, top),
				heightPct: Math.max(0.04, bottom - top),
				title,
				timeLabel: fmtHM(sp.hour, sp.minute),
			});
		}
	}

	return { ...base, allDayItems, timedItems };
}
