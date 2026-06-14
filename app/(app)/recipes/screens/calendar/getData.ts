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
	weekday: string;
	dayNum: number;
	isToday: boolean;
}
interface AllDayItem {
	dayIndex: number;
	span: number;
	title: string;
}
interface TimedItem {
	dayIndex: number;
	startMin: number;
	endMin: number;
	lane: number;
	lanes: number;
	title: string;
	timeLabel: string;
}

export interface CalendarData {
	tz: string;
	tzLabel: string;
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
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

const ampm = (h: number) => (h < 12 ? "a" : "p");
const h12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
const stamp = (h: number, m: number) =>
	m === 0 ? `${h12(h)}` : `${h12(h)}:${String(m).padStart(2, "0")}`;

// Compact range like "10–11a", "10:30–11:30a", "11a–12p".
function fmtRange(sh: number, sm: number, eh: number, em: number): string {
	const start = stamp(sh, sm) + (ampm(sh) === ampm(eh) ? "" : ampm(sh));
	return `${start}–${stamp(eh, em)}${ampm(eh)}`;
}

// Block SSRF to loopback / private / link-local hosts (recipe params can be
// user-supplied when auth is enabled).
function isSafeUrl(raw: string): boolean {
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		return false;
	}
	if (u.protocol !== "http:" && u.protocol !== "https:") return false;
	const host = u.hostname.toLowerCase();
	if (
		host === "localhost" ||
		host === "0.0.0.0" ||
		host === "::1" ||
		host.endsWith(".localhost") ||
		host.endsWith(".internal") ||
		host.endsWith(".local")
	) {
		return false;
	}
	const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (v4) {
		const a = Number(v4[1]);
		const b = Number(v4[2]);
		if (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			(a === 100 && b >= 64 && b <= 127)
		) {
			return false;
		}
	}
	// IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
	if (host.includes(":") && /^(f[cd]|fe[89ab])/.test(host)) return false;
	return true;
}

async function fetchIcs(url: string): Promise<string | null> {
	if (!isSafeUrl(url)) return null;
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

// Side-by-side columns for overlapping events within a single day.
function assignLanes(evs: TimedItem[]): void {
	evs.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
	let i = 0;
	while (i < evs.length) {
		let j = i;
		let clusterEnd = evs[i].endMin;
		while (j + 1 < evs.length && evs[j + 1].startMin < clusterEnd) {
			j++;
			clusterEnd = Math.max(clusterEnd, evs[j].endMin);
		}
		const colEnds: number[] = [];
		for (let k = i; k <= j; k++) {
			const e = evs[k];
			let placed = false;
			for (let c = 0; c < colEnds.length; c++) {
				if (e.startMin >= colEnds[c]) {
					e.lane = c;
					colEnds[c] = e.endMin;
					placed = true;
					break;
				}
			}
			if (!placed) {
				e.lane = colEnds.length;
				colEnds.push(e.endMin);
			}
		}
		for (let k = i; k <= j; k++) evs[k].lanes = colEnds.length;
		i = j + 1;
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
		const wd =
			WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
		days.push({ weekday: wd, dayNum: p.day, isToday: i === 0 });
	}

	const tzLabel =
		new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			timeZoneName: "shortOffset",
		})
			.formatToParts(now)
			.find((p) => p.type === "timeZoneName")?.value || "";
	const updatedLabel = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(now);

	const base: CalendarData = {
		tz,
		tzLabel,
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

		type Raw = {
			start: { toJSDate(): Date; isDate: boolean };
			end: { toJSDate(): Date };
			summary: string;
		};
		const raw: Raw[] = [
			...(
				parsed.events as {
					startDate: Raw["start"];
					endDate: Raw["end"];
					summary: string;
				}[]
			).map((e) => ({
				start: e.startDate,
				end: e.endDate,
				summary: e.summary,
			})),
			...(
				parsed.occurrences as {
					startDate: Raw["start"];
					endDate: Raw["end"];
					item: { summary: string };
				}[]
			).map((o) => ({
				start: o.startDate,
				end: o.endDate,
				summary: o.item.summary,
			})),
		];

		for (const ev of raw) {
			const title = (ev.summary || "(busy)")
				.toString()
				.replace(/\s+/g, " ")
				.trim();
			const start = ev.start.toJSDate();
			const end = ev.end.toJSDate();
			const durationMs = end.getTime() - start.getTime();
			const sp = tzParts(start, tz);
			const startIdx = dayKeys.indexOf(sp.ymd);

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
			timedItems.push({
				dayIndex: startIdx,
				startMin,
				endMin: Math.max(endMin, startMin + 15),
				lane: 0,
				lanes: 1,
				title,
				timeLabel: fmtRange(sp.hour, sp.minute, ep.hour, ep.minute),
			});
		}
	}

	// Lay out overlaps per day into side-by-side lanes.
	for (let d = 0; d < 7; d++) {
		assignLanes(timedItems.filter((e) => e.dayIndex === d));
	}

	// Auto-fit the visible hours to the events (e-ink is short — keep rows tall
	// and readable instead of cramming the whole configured day range).
	let vStart = Math.max(dayStartHour, 8);
	let vEnd = Math.min(dayEndHour, 18);
	if (timedItems.length) {
		let lo = 24 * 60;
		let hi = 0;
		for (const e of timedItems) {
			lo = Math.min(lo, e.startMin);
			hi = Math.max(hi, e.endMin);
		}
		vStart = Math.max(dayStartHour, Math.floor(lo / 60));
		vEnd = Math.min(dayEndHour, Math.ceil(hi / 60));
	}
	if (vEnd - vStart < 6) {
		vEnd = Math.min(dayEndHour, vStart + 6);
		vStart = Math.max(dayStartHour, vEnd - 6);
	}
	if (vEnd <= vStart) {
		vStart = dayStartHour;
		vEnd = dayEndHour;
	}
	const visHours: number[] = [];
	for (let h = vStart; h <= vEnd; h++) visHours.push(h);

	return {
		...base,
		dayStartHour: vStart,
		dayEndHour: vEnd,
		hours: visHours,
		allDayItems,
		timedItems,
	};
}
