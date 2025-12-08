// Shared constants for mixup layouts
// This file must not import any server-only dependencies
// so it can be safely imported in client components and API routes.
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";

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
	/** X position on the final canvas */
	x: number;
	/** Y position on the final canvas */
	y: number;
};

export type LayoutOption = {
	id: MixupLayoutId;
	slots: LayoutSlot[];
};

// Relative layout slot definition (proportions from 0 to 1)
type RelativeLayoutSlot = {
	id: string;
	label: string;
	rowSpan?: number;
	colSpan?: number;
	hint?: string;
	/** Relative X position (0-1) */
	relX: number;
	/** Relative Y position (0-1) */
	relY: number;
	/** Relative width (0-1) */
	relWidth: number;
	/** Relative height (0-1) */
	relHeight: number;
};

type RelativeLayoutOption = {
	id: MixupLayoutId;
	slots: RelativeLayoutSlot[];
};

// Layout definitions using relative proportions (0-1)
const RELATIVE_LAYOUT_OPTIONS: RelativeLayoutOption[] = [
	{
		id: MixupLayoutId.QUARTERS,
		slots: [
			{
				id: "top-left",
				label: "Top left",
				relX: 0,
				relY: 0,
				relWidth: 0.5,
				relHeight: 0.5,
			},
			{
				id: "top-right",
				label: "Top right",
				relX: 0.5,
				relY: 0,
				relWidth: 0.5,
				relHeight: 0.5,
			},
			{
				id: "bottom-left",
				label: "Bottom left",
				relX: 0,
				relY: 0.5,
				relWidth: 0.5,
				relHeight: 0.5,
			},
			{
				id: "bottom-right",
				label: "Bottom right",
				relX: 0.5,
				relY: 0.5,
				relWidth: 0.5,
				relHeight: 0.5,
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
				relX: 0,
				relY: 0,
				relWidth: 1,
				relHeight: 0.5,
			},
			{
				id: "bottom-left",
				label: "Bottom left",
				relX: 0,
				relY: 0.5,
				relWidth: 0.5,
				relHeight: 0.5,
			},
			{
				id: "bottom-right",
				label: "Bottom right",
				relX: 0.5,
				relY: 0.5,
				relWidth: 0.5,
				relHeight: 0.5,
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
				relX: 0,
				relY: 0,
				relWidth: 0.5,
				relHeight: 1,
			},
			{
				id: "top-right",
				label: "Top right",
				relX: 0.5,
				relY: 0,
				relWidth: 0.5,
				relHeight: 0.5,
			},
			{
				id: "bottom-right",
				label: "Bottom right",
				relX: 0.5,
				relY: 0.5,
				relWidth: 0.5,
				relHeight: 0.5,
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
				relX: 0,
				relY: 0,
				relWidth: 0.5,
				relHeight: 1,
			},
			{
				id: "right-half",
				label: "Right half",
				rowSpan: 2,
				hint: "2 quarters",
				relX: 0.5,
				relY: 0,
				relWidth: 0.5,
				relHeight: 1,
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
				relX: 0,
				relY: 0,
				relWidth: 1,
				relHeight: 0.5,
			},
			{
				id: "bottom-half",
				label: "Bottom half",
				colSpan: 2,
				hint: "2 quarters",
				relX: 0,
				relY: 0.5,
				relWidth: 1,
				relHeight: 0.5,
			},
		],
	},
];

/**
 * Get a layout by ID and scale it to the specified dimensions
 * @param id - The layout ID
 * @param width - Target canvas width (defaults to DEFAULT_IMAGE_WIDTH)
 * @param height - Target canvas height (defaults to DEFAULT_IMAGE_HEIGHT)
 * @returns The scaled layout option, or undefined if not found
 */
export const getLayoutById = (
	id: MixupLayoutId | string,
	width: number = DEFAULT_IMAGE_WIDTH,
	height: number = DEFAULT_IMAGE_HEIGHT,
): LayoutOption | undefined => {
	const relativeLayout = RELATIVE_LAYOUT_OPTIONS.find(
		(layout) => layout.id === id,
	);
	if (!relativeLayout) return undefined;

	// Scale relative proportions to actual dimensions
	const slots: LayoutSlot[] = relativeLayout.slots.map((slot) => ({
		id: slot.id,
		label: slot.label,
		rowSpan: slot.rowSpan,
		colSpan: slot.colSpan,
		hint: slot.hint,
		width: Math.round(slot.relWidth * width),
		height: Math.round(slot.relHeight * height),
		x: Math.round(slot.relX * width),
		y: Math.round(slot.relY * height),
	}));

	return {
		id: relativeLayout.id,
		slots,
	};
};

/**
 * Default layout options using the standard canvas dimensions
 * This is exported for backward compatibility and UI components that don't need custom sizing
 */
export const LAYOUT_OPTIONS: LayoutOption[] = RELATIVE_LAYOUT_OPTIONS.map(
	(relativeLayout) => {
		const slots: LayoutSlot[] = relativeLayout.slots.map((slot) => ({
			id: slot.id,
			label: slot.label,
			rowSpan: slot.rowSpan,
			colSpan: slot.colSpan,
			hint: slot.hint,
			width: Math.round(slot.relWidth * DEFAULT_IMAGE_WIDTH),
			height: Math.round(slot.relHeight * DEFAULT_IMAGE_HEIGHT),
			x: Math.round(slot.relX * DEFAULT_IMAGE_WIDTH),
			y: Math.round(slot.relY * DEFAULT_IMAGE_HEIGHT),
		}));

		return {
			id: relativeLayout.id,
			slots,
		};
	},
);

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
