/**
 * Decide how many calendar day-columns to render.
 *
 * Two modes:
 *   - Auto (daysToShow falsy / 0): fold to 3 days (today + next 2) on narrow
 *     screens, otherwise show the full week. "Narrow" is keyed on the logical
 *     (CSS) width so it reflects on-device size, matching the screen-profile
 *     compact-width boundary.
 *   - Explicit (daysToShow 1-7): the user pins an exact day count, overriding
 *     the width-based fold. Always clamped to the days we actually have.
 */
export const CALENDAR_NARROW_LOGICAL_WIDTH = 640;

export function resolveCalendarDayCount({
	logicalWidth,
	availableDays,
	daysToShow,
}: {
	logicalWidth: number;
	availableDays: number;
	daysToShow?: number;
}): number {
	const fullDayCount = availableDays > 0 ? availableDays : 7;

	if (typeof daysToShow === "number" && daysToShow > 0) {
		return Math.min(Math.max(1, Math.round(daysToShow)), fullDayCount);
	}

	return logicalWidth < CALENDAR_NARROW_LOGICAL_WIDTH
		? Math.min(3, fullDayCount)
		: fullDayCount;
}
