/**
 * Visual treatment for calendar events on grayscale e-ink panels.
 *
 *  - Multiple calendars: each feed gets a distinct shade so events are
 *    distinguishable at a glance. With a single feed everything stays solid
 *    black (no visual change from before).
 *  - The meeting happening right now is drawn gray so it stands out, paired
 *    with the current-time line. This wins over the per-calendar shade.
 *
 * All values are grayscale so they survive 1-bit / 4-level / 16-level
 * quantization on the various TRMNL + BYOD panels.
 */

export const CALENDAR_EVENT_SHADES = [
	"#000000", // calendar 1
	"#5b5b5b", // calendar 2
	"#2f2f2f", // calendar 3
	"#777777", // calendar 4
	"#3f3f3f", // calendar 5
	"#8a8a8a", // calendar 6
] as const;

/** Gray fill used for the meeting currently in progress. */
export const CURRENT_MEETING_SHADE = "#9a9a9a";

export type EventAppearance = { background: string; text: string };

function textColorForBackground(hex: string): string {
	const value = hex.replace("#", "");
	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	// Perceived luminance (Rec. 601). Light fills get black text, dark fills white.
	const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
	return luminance < 150 ? "#ffffff" : "#000000";
}

export function getEventAppearance({
	calendarIndex = 0,
	calendarCount = 1,
	isCurrent = false,
}: {
	calendarIndex?: number;
	calendarCount?: number;
	isCurrent?: boolean;
}): EventAppearance {
	if (isCurrent) {
		return {
			background: CURRENT_MEETING_SHADE,
			text: textColorForBackground(CURRENT_MEETING_SHADE),
		};
	}

	const background =
		calendarCount > 1
			? CALENDAR_EVENT_SHADES[
					Math.abs(calendarIndex) % CALENDAR_EVENT_SHADES.length
				]
			: "#000000";

	return { background, text: textColorForBackground(background) };
}
