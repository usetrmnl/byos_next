import dns from "node:dns/promises";
import net from "node:net";
import IcalExpander from "ical-expander";

export const dynamic = "force-dynamic";

export type CalendarParams = {
	icsUrl?: string;
	dayStartHour?: number | string;
	dayEndHour?: number | string;
	timezone?: string;
};

export interface DayHeader {
	weekday: string;
	dayNum: number;
	isToday: boolean;
}

export interface AllDayItem {
	dayIndex: number;
	span: number;
	title: string;
}

export interface TimedItem {
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

type RawCalendarEvent = {
	start: { toJSDate(): Date; isDate: boolean };
	end: { toJSDate(): Date };
	summary?: string;
};

const DAY_MS = 86_400_000;
const DEFAULT_TIMEZONE = "Australia/Sydney";
const MAX_ICS_BYTES = 1024 * 1024;
const MAX_ICS_URLS = 5;
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function safeTimezone(value: string | undefined): string {
	const timezone = value?.trim() || DEFAULT_TIMEZONE;
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
		return timezone;
	} catch {
		return DEFAULT_TIMEZONE;
	}
}

function tzParts(date: Date, tz: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const byType = Object.fromEntries(
		parts.map((part) => [part.type, part.value]),
	);
	const hour = Number(byType.hour) % 24;

	return {
		year: Number(byType.year),
		month: Number(byType.month),
		day: Number(byType.day),
		hour,
		minute: Number(byType.minute),
		ymd: `${byType.year}-${byType.month}-${byType.day}`,
		minutes: hour * 60 + Number(byType.minute),
	};
}

function toHour(value: unknown, fallback: number): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.min(23, Math.max(0, Math.round(n)));
}

function formatRange(startMin: number, endMin: number): string {
	const formatPart = (minutes: number, showPeriod: boolean) => {
		const hour = Math.floor(minutes / 60) % 24;
		const minute = minutes % 60;
		const period = hour < 12 ? "a" : "p";
		const hour12 = hour % 12 === 0 ? 12 : hour % 12;
		const time =
			minute === 0
				? `${hour12}`
				: `${hour12}:${String(minute).padStart(2, "0")}`;
		return showPeriod ? `${time}${period}` : time;
	};
	const startPeriod = Math.floor(startMin / 60) < 12 ? "a" : "p";
	const endPeriod = Math.floor(endMin / 60) % 24 < 12 ? "a" : "p";
	return `${formatPart(startMin, startPeriod !== endPeriod)}–${formatPart(
		endMin,
		true,
	)}`;
}

function parseIpv4(host: string): number[] | null {
	const parts = host.split(".");
	if (parts.length !== 4) return null;
	const nums = parts.map((part) => Number(part));
	if (nums.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) {
		return null;
	}
	return nums;
}

function isPrivateIpv4(host: string): boolean {
	const parts = parseIpv4(host);
	if (!parts) return false;
	const [a, b] = parts;
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 0) ||
		(a === 192 && b === 168) ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224
	);
}

function isPrivateIpAddress(address: string): boolean {
	const host = address.toLowerCase().replace(/^\[|\]$/g, "");
	if (host.startsWith("::ffff:")) {
		const mapped = host.slice("::ffff:".length);
		return parseIpv4(mapped) ? isPrivateIpv4(mapped) : true;
	}
	if (parseIpv4(host)) return isPrivateIpv4(host);
	if (net.isIP(host) === 6) {
		return (
			host === "::" ||
			host === "::1" ||
			host.startsWith("fc") ||
			host.startsWith("fd") ||
			/^fe[89ab]/.test(host)
		);
	}
	return false;
}

function isSafeUrl(raw: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return false;
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
	const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
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
	if (host.startsWith("::ffff:")) {
		const mapped = host.slice("::ffff:".length);
		return parseIpv4(mapped) ? !isPrivateIpv4(mapped) : false;
	}
	if (isPrivateIpAddress(host)) return false;

	// IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
	if (host.includes(":") && /^(f[cd]|fe[89ab])/.test(host)) return false;
	return true;
}

async function resolvesToPublicAddress(hostname: string): Promise<boolean> {
	if (net.isIP(hostname)) return !isPrivateIpAddress(hostname);
	try {
		const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
		return (
			addresses.length > 0 &&
			addresses.every(({ address }) => !isPrivateIpAddress(address))
		);
	} catch {
		return false;
	}
}

async function readTextWithLimit(
	response: Response,
	maxBytes: number,
): Promise<string | null> {
	const declaredLength = response.headers.get("content-length");
	if (declaredLength) {
		const parsed = Number.parseInt(declaredLength, 10);
		if (Number.isFinite(parsed) && parsed > maxBytes) return null;
	}

	if (!response.body) return null;
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function fetchIcs(url: string): Promise<string | null> {
	if (!isSafeUrl(url)) return null;
	const parsed = new URL(url);
	if (!(await resolvesToPublicAddress(parsed.hostname))) return null;
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 7000);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: { Accept: "text/calendar" },
			redirect: "manual",
		});
		return res.ok ? await readTextWithLimit(res, MAX_ICS_BYTES) : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

function normalizeEvents(parsed: {
	events: unknown[];
	occurrences: unknown[];
}): RawCalendarEvent[] {
	const events = (
		parsed.events as {
			startDate: RawCalendarEvent["start"];
			endDate: RawCalendarEvent["end"];
			summary?: string;
		}[]
	).map((event) => ({
		start: event.startDate,
		end: event.endDate,
		summary: event.summary,
	}));

	const occurrences = (
		parsed.occurrences as {
			startDate: RawCalendarEvent["start"];
			endDate: RawCalendarEvent["end"];
			item: { summary?: string };
		}[]
	).map((occurrence) => ({
		start: occurrence.startDate,
		end: occurrence.endDate,
		summary: occurrence.item.summary,
	}));

	return [...events, ...occurrences];
}

function assignLanes(events: TimedItem[]): void {
	events.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
	const laneEnds: number[] = [];

	for (const event of events) {
		const lane = laneEnds.findIndex((end) => event.startMin >= end);
		event.lane = lane === -1 ? laneEnds.length : lane;
		laneEnds[event.lane] = event.endMin;
	}

	const lanes = Math.max(1, laneEnds.length);
	for (const event of events) event.lanes = lanes;
}

function hourRange(start: number, end: number): number[] {
	const hours: number[] = [];
	for (let h = start; h <= end; h++) hours.push(h);
	return hours;
}

export default async function getData(
	params?: CalendarParams,
): Promise<CalendarData> {
	const tz = safeTimezone(params?.timezone);
	const requestedStart = toHour(params?.dayStartHour, 7);
	const requestedEnd = Math.max(
		requestedStart + 1,
		toHour(params?.dayEndHour, 22),
	);
	const now = new Date();
	const today = tzParts(now, tz);
	const anchor = Date.UTC(today.year, today.month - 1, today.day, 12);
	const localDayOffset = (date: Date) => {
		const p = tzParts(date, tz);
		return Math.round(
			(Date.UTC(p.year, p.month - 1, p.day, 12) - anchor) / DAY_MS,
		);
	};

	const days = Array.from({ length: 7 }, (_, i) => {
		const p = tzParts(new Date(anchor + i * DAY_MS), tz);
		return {
			weekday:
				WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()],
			dayNum: p.day,
			isToday: i === 0,
		};
	});

	const base: CalendarData = {
		tz,
		tzLabel:
			new Intl.DateTimeFormat("en-US", {
				timeZone: tz,
				timeZoneName: "shortOffset",
			})
				.formatToParts(now)
				.find((part) => part.type === "timeZoneName")?.value || "",
		dayStartHour: requestedStart,
		dayEndHour: requestedEnd,
		hours: hourRange(requestedStart, requestedEnd),
		days,
		allDayItems: [],
		timedItems: [],
		updatedLabel: new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}).format(now),
	};

	const urls = (params?.icsUrl || "")
		.split(/[\n,]+/)
		.map((url) => url.trim())
		.filter(Boolean)
		.slice(0, MAX_ICS_URLS);
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
			parsed = new IcalExpander({
				ics: result.value,
				maxIterations: 2000,
			}).between(winStart, winEnd);
		} catch {
			continue;
		}

		for (const event of normalizeEvents(parsed)) {
			const start = event.start.toJSDate();
			const end = event.end.toJSDate();
			if (end <= start) continue;

			const title = (event.summary || "(busy)").replace(/\s+/g, " ").trim();
			const startParts = tzParts(start, tz);
			const endParts = tzParts(end, tz);
			const startDay = localDayOffset(start);
			const endMinusOne = new Date(end.getTime() - 1);
			const endDay = Math.max(startDay, localDayOffset(endMinusOne));
			const durationMs = end.getTime() - start.getTime();

			if (event.start.isDate || durationMs >= 20 * 3600 * 1000) {
				const from = Math.max(0, startDay);
				const to = Math.min(6, endDay);
				if (to >= from) {
					allDayItems.push({ dayIndex: from, span: to - from + 1, title });
				}
				continue;
			}

			for (let day = Math.max(0, startDay); day <= Math.min(6, endDay); day++) {
				const segmentStart = day === startDay ? startParts.minutes : 0;
				const segmentEnd =
					day === endDay
						? localDayOffset(end) === day
							? endParts.minutes
							: 24 * 60
						: 24 * 60;
				if (segmentEnd <= segmentStart) continue;

				timedItems.push({
					dayIndex: day,
					startMin: segmentStart,
					endMin: Math.max(segmentEnd, segmentStart + 15),
					lane: 0,
					lanes: 1,
					title,
					timeLabel: formatRange(segmentStart, segmentEnd),
				});
			}
		}
	}

	for (let day = 0; day < 7; day++) {
		assignLanes(timedItems.filter((event) => event.dayIndex === day));
	}

	let dayStartHour = Math.max(requestedStart, 8);
	let dayEndHour = Math.min(requestedEnd, 18);
	if (timedItems.length > 0) {
		const minStart = Math.min(...timedItems.map((event) => event.startMin));
		const maxEnd = Math.max(...timedItems.map((event) => event.endMin));
		dayStartHour = Math.max(requestedStart, Math.floor(minStart / 60));
		dayEndHour = Math.min(requestedEnd, Math.ceil(maxEnd / 60));
	}
	if (dayEndHour - dayStartHour < 6) {
		dayEndHour = Math.min(requestedEnd, dayStartHour + 6);
		dayStartHour = Math.max(requestedStart, dayEndHour - 6);
	}

	return {
		...base,
		dayStartHour,
		dayEndHour,
		hours: hourRange(dayStartHour, dayEndHour),
		allDayItems,
		timedItems,
	};
}
