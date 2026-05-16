import ICAL from "ical.js";

export interface CalendarEvent {
	title: string;
	start: string; // ISO 8601 string
	end: string; // ISO 8601 string
	allDay: boolean;
	description?: string;
}

/**
 * Parse raw ICS text and return events within [rangeStart, rangeEnd].
 * Handles recurring events (RRULE) and all-day events.
 * Events are sorted ascending by start time.
 */
export function parseICS(
	icsText: string,
	rangeStart: Date,
	rangeEnd: Date,
	maxRecurrences?: number,
): CalendarEvent[] {
	let jcalData: ReturnType<typeof ICAL.parse>;
	try {
		jcalData = ICAL.parse(icsText);
	} catch {
		return [];
	}

	const comp = new ICAL.Component(jcalData);
	const vevents = comp.getAllSubcomponents("vevent");
	const results: CalendarEvent[] = [];

	const icalStart = ICAL.Time.fromJSDate(rangeStart, true);
	const icalEnd = ICAL.Time.fromJSDate(rangeEnd, true);

	for (const vevent of vevents) {
		const event = new ICAL.Event(vevent);
		if (!event.startDate) continue;

		if (event.isRecurring()) {
			// Do not pass icalStart to iterator() — it skips UNTIL/EXDATE validation for past occurrences.
			const iterator = event.iterator();
			let next: ICAL.Time | null = iterator.next();
			let safetyCount = 0;
			let occurrenceCount = 0;
			while (next && next.compare(icalEnd) <= 0 && safetyCount < 500) {
				safetyCount++;
				if (next.compare(icalStart) >= 0) {
					if (
						maxRecurrences !== undefined &&
						maxRecurrences > 0 &&
						occurrenceCount >= maxRecurrences
					)
						break;
					occurrenceCount++;
					const occurrence = event.getOccurrenceDetails(next);
					results.push({
						title: occurrence.item.summary?.trim() || "Untitled",
						start: occurrence.startDate.toJSDate().toISOString(),
						end: occurrence.endDate.toJSDate().toISOString(),
						allDay: occurrence.startDate.isDate,
						description: occurrence.item.description?.trim(),
					});
				}
				next = iterator.next();
			}
		} else {
			const startJS = event.startDate.toJSDate();
			if (startJS >= rangeStart && startJS < rangeEnd) {
				results.push({
					title: event.summary?.trim() || "Untitled",
					start: event.startDate.toJSDate().toISOString(),
					end:
						event.endDate?.toJSDate().toISOString() ??
						event.startDate.toJSDate().toISOString(),
					allDay: event.startDate.isDate,
					description: event.description?.trim(),
				});
			}
		}
	}

	return results.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Extract calendar name from ICS text (X-WR-CALNAME property).
 * Returns null if not present.
 */
export function extractCalendarName(icsText: string): string | null {
	const match = icsText.match(/^X-WR-CALNAME:(.+)$/m);
	return match ? match[1].trim() : null;
}

/**
 * Group a sorted event list by calendar date string.
 */
export interface DayGroup {
	dateLabel: string; // e.g. "Mon, May 16"
	dateISO: string; // e.g. "2026-05-16"
	events: CalendarEvent[];
}

export function groupEventsByDay(events: CalendarEvent[]): DayGroup[] {
	const map = new Map<string, CalendarEvent[]>();

	for (const event of events) {
		const d = new Date(event.start);
		const iso = d.toISOString().slice(0, 10);
		if (!map.has(iso)) map.set(iso, []);
		map.get(iso)?.push(event);
	}

	const result: DayGroup[] = [];
	for (const [iso, evts] of map) {
		const d = new Date(`${iso}T00:00:00Z`);
		result.push({
			dateISO: iso,
			dateLabel: d.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			}),
			events: evts,
		});
	}

	return result.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}
