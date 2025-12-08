// Shared constants for mixup layouts
// This file must not import any server-only dependencies
// so it can be safely imported in client components and API routes.

export enum MixupLayoutId {
	QUARTERS = "quarters",
	TOP_BANNER = "top-banner",
	LEFT_RAIL = "left-rail",
	VERTICAL_HALVES = "vertical-halves",
	HORIZONTAL_HALVES = "horizontal-halves",
}

export enum DeviceDisplayMode {
	SCREEN = "screen",
	PLAYLIST = "playlist",
	MIXUP = "mixup",
}

export type LayoutSlot = {
	id: string;
	label: string;
	rowSpan?: number;
	colSpan?: number;
	hint?: string;
	/** Width to render the recipe at (for higher quality before scaling) */
	width: number;
	/** Height to render the recipe at (for higher quality before scaling) */
	height: number;
	/** X position on the final 800x480 canvas */
	x: number;
	/** Y position on the final 800x480 canvas */
	y: number;
};

export type LayoutOption = {
	id: MixupLayoutId;
	slots: LayoutSlot[];
};

// Full screen dimensions
export const MIXUP_CANVAS_WIDTH = 800;
export const MIXUP_CANVAS_HEIGHT = 480;

export const LAYOUT_OPTIONS: LayoutOption[] = [
	{
		id: MixupLayoutId.QUARTERS,
		slots: [
			{
				id: "top-left",
				label: "Top left",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: 0,
				y: 0,
			},
			{
				id: "top-right",
				label: "Top right",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: MIXUP_CANVAS_WIDTH / 2,
				y: 0,
			},
			{
				id: "bottom-left",
				label: "Bottom left",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: 0,
				y: MIXUP_CANVAS_HEIGHT / 2,
			},
			{
				id: "bottom-right",
				label: "Bottom right",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: MIXUP_CANVAS_WIDTH / 2,
				y: MIXUP_CANVAS_HEIGHT / 2,
			},
		],
	},
	{
		id: MixupLayoutId.TOP_BANNER,
		slots: [
			{
				id: "top",
				label: "Top span",
				colSpan: 2,
				hint: "2 quarters",
				width: MIXUP_CANVAS_WIDTH,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: 0,
				y: 0,
			},
			{
				id: "bottom-left",
				label: "Bottom left",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: 0,
				y: MIXUP_CANVAS_HEIGHT / 2,
			},
			{
				id: "bottom-right",
				label: "Bottom right",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: MIXUP_CANVAS_WIDTH / 2,
				y: MIXUP_CANVAS_HEIGHT / 2,
			},
		],
	},
	{
		id: MixupLayoutId.LEFT_RAIL,
		slots: [
			{
				id: "left",
				label: "Left column",
				rowSpan: 2,
				hint: "2 quarters",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT,
				x: 0,
				y: 0,
			},
			{
				id: "top-right",
				label: "Top right",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT,
				x: MIXUP_CANVAS_WIDTH / 2,
				y: 0,
			},
			{
				id: "bottom-right",
				label: "Bottom right",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: MIXUP_CANVAS_WIDTH / 2,
				y: MIXUP_CANVAS_HEIGHT / 2,
			},
		],
	},
	{
		id: MixupLayoutId.VERTICAL_HALVES,
		slots: [
			{
				id: "left-half",
				label: "Left half",
				rowSpan: 2,
				hint: "2 quarters",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT,
				x: 0,
				y: 0,
			},
			{
				id: "right-half",
				label: "Right half",
				rowSpan: 2,
				hint: "2 quarters",
				width: MIXUP_CANVAS_WIDTH / 2,
				height: MIXUP_CANVAS_HEIGHT,
				x: MIXUP_CANVAS_WIDTH / 2,
				y: 0,
			},
		],
	},
	{
		id: MixupLayoutId.HORIZONTAL_HALVES,
		slots: [
			{
				id: "top-half",
				label: "Top half",
				colSpan: 2,
				hint: "2 quarters",
				width: MIXUP_CANVAS_WIDTH,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: 0,
				y: 0,
			},
			{
				id: "bottom-half",
				label: "Bottom half",
				colSpan: 2,
				hint: "2 quarters",
				width: MIXUP_CANVAS_WIDTH,
				height: MIXUP_CANVAS_HEIGHT / 2,
				x: 0,
				y: MIXUP_CANVAS_HEIGHT / 2,
			},
		],
	},
];

export const getLayoutById = (
	id: MixupLayoutId | string,
): LayoutOption | undefined =>
	LAYOUT_OPTIONS.find((layout) => layout.id === id);

export const buildAssignments = (
	layout: LayoutOption,
	recipes: Array<{ slug: string }>,
	existing?: Record<string, string>,
): Record<string, string> => {
	const next: Record<string, string> = {};
	layout.slots.forEach((slot, index) => {
		const inherited = existing?.[slot.id];
		const fallback = recipes[index]?.slug;
		if (inherited) {
			next[slot.id] = inherited;
		} else if (fallback) {
			next[slot.id] = fallback;
		}
	});
	return next;
};

/**
 * Convert mixup slots from database to assignments object
 * Useful when loading a mixup back into the builder
 */
export const slotsToAssignments = (
	slots: Array<{ slot_id: string; recipe_slug: string | null }>,
): Record<string, string> => {
	const assignments: Record<string, string> = {};
	for (const slot of slots) {
		if (slot.recipe_slug) {
			assignments[slot.slot_id] = slot.recipe_slug;
		}
	}
	return assignments;
};
