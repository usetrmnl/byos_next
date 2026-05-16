import { unstable_cache } from "next/cache";
import {
	type DayGroup,
	extractCalendarName,
	groupEventsByDay,
	parseICS,
} from "@/lib/recipes/ics-parser";

export const dynamic = "force-dynamic";

interface CalendarParams {
	calendarUrl1?: string;
	calendarUrl2?: string;
	calendarUrl3?: string;
	calendarUrl4?: string;
	calendarUrl5?: string;
	calendarName1?: string;
	calendarName2?: string;
	calendarName3?: string;
	calendarName4?: string;
	calendarName5?: string;
	maxEvents?: number | string;
	fontSize?: string;
}

export interface CalendarColumn {
	name: string;
	dayGroups: DayGroup[];
	error?: string;
}

export interface CalendarData {
	columns: CalendarColumn[];
	fetchedAt: string;
	fontSize: string;
}

async function fetchAndParseCalendar(
	url: string,
	name: string | undefined,
	rangeStart: Date,
	rangeEnd: Date,
	maxEvents: number,
): Promise<CalendarColumn> {
	try {
		const response = await fetch(url, {
			headers: { Accept: "text/calendar, text/plain, */*" },
			next: { revalidate: 0 },
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			return {
				name: name || "Calendar",
				dayGroups: [],
				error: `HTTP ${response.status}`,
			};
		}

		const icsText = await response.text();
		if (!icsText.includes("BEGIN:VCALENDAR")) {
			return {
				name: name || "Calendar",
				dayGroups: [],
				error: "URL did not return a valid ICS calendar",
			};
		}
		const resolvedName =
			name?.trim() || extractCalendarName(icsText) || "Calendar";
		const allEvents = parseICS(icsText, rangeStart, rangeEnd);
		const events = allEvents.slice(0, maxEvents);
		const dayGroups = groupEventsByDay(events);

		return { name: resolvedName, dayGroups };
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Fetch failed";
		return { name: name || "Calendar", dayGroups: [], error: msg };
	}
}

async function buildCalendarData(
	params?: CalendarParams,
): Promise<CalendarData> {
	const maxEvents = Math.max(
		5,
		Math.min(50, Number(params?.maxEvents ?? 15) || 15),
	);
	const fontSize = ["small", "medium", "large"].includes(params?.fontSize ?? "")
		? (params?.fontSize as string)
		: "medium";

	const now = new Date();
	const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	// 2-year lookahead ensures the iterator always finds enough upcoming events
	const rangeEnd = new Date(rangeStart.getTime() + 730 * 24 * 60 * 60 * 1000);

	const entries: Array<{ url: string; name?: string }> = [
		{ url: params?.calendarUrl1 ?? "", name: params?.calendarName1 },
		{ url: params?.calendarUrl2 ?? "", name: params?.calendarName2 },
		{ url: params?.calendarUrl3 ?? "", name: params?.calendarName3 },
		{ url: params?.calendarUrl4 ?? "", name: params?.calendarName4 },
		{ url: params?.calendarUrl5 ?? "", name: params?.calendarName5 },
	].filter((e) => e.url.trim().length > 0);

	const fetchedAt = now.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});

	if (entries.length === 0) {
		return { columns: [], fetchedAt, fontSize };
	}

	const columns = await Promise.all(
		entries.map((e) =>
			fetchAndParseCalendar(e.url, e.name, rangeStart, rangeEnd, maxEvents),
		),
	);

	return { columns, fetchedAt, fontSize };
}

const getCachedCalendarData = unstable_cache(
	async (params?: CalendarParams): Promise<CalendarData> => {
		const data = await buildCalendarData(params);
		if (data.columns.length === 0)
			throw new Error("No calendars configured — skip cache");
		return data;
	},
	["ics-calendar-data"],
	{ tags: ["ics-calendar"], revalidate: 900 },
);

export default async function getData(
	params?: CalendarParams,
): Promise<CalendarData> {
	try {
		return await getCachedCalendarData(params);
	} catch {
		return buildCalendarData(params);
	}
}
