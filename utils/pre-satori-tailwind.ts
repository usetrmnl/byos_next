import React, { type CSSProperties } from "react";
import { twMerge } from "tailwind-merge";
import { ditherPatterns } from "./dither-patterns";

const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	"2xl": 1536,
} as const;

const responsivePattern = /^(max-)?(sm|md|lg|xl|2xl):(.+)$/;

// Satori-compatible reset styles
const satoriResetStyles = {
	common: "m-0 p-0 mt-0 mb-0 border-0 bg-transparent shadow-none",
	heading: "m-0 p-0 mt-0 mb-0 border-0 bg-transparent shadow-none",
	paragraph: "m-0 p-0 mt-0 mb-0 border-0 bg-transparent shadow-none",
	div: "m-0 p-0 mt-0 mb-0 border-0 bg-transparent shadow-none",
} as const;

export function getResetStyles(child: React.ReactNode): string {
	if (!React.isValidElement(child) || typeof child.type !== "string") {
		return "";
	}

	const { type } = child;
	if (type.startsWith("h")) return satoriResetStyles.heading;
	if (type === "p") return satoriResetStyles.paragraph;
	if (type === "div") return satoriResetStyles.div;
	return satoriResetStyles.common;
}

const GAP_SCALE = 4;

function normalizeGapValue(value: string): string | undefined {
	if (value === "0") return "0px";
	if (value === "px") return "1px";
	const numericValue = parseFloat(value);
	return Number.isNaN(numericValue)
		? undefined
		: `${numericValue * GAP_SCALE}px`;
}

function parseGapClass(className: string): {
	gap?: string;
	gapX?: string;
	gapY?: string;
} {
	if (!className.startsWith("gap-")) return {};
	const value = className.slice(4);

	if (value.startsWith("x-")) {
		const normalized = normalizeGapValue(value.slice(2));
		return normalized ? { gapX: normalized } : {};
	}
	if (value.startsWith("y-")) {
		const normalized = normalizeGapValue(value.slice(2));
		return normalized ? { gapY: normalized } : {};
	}
	const normalized = normalizeGapValue(value);
	return normalized ? { gap: normalized } : {};
}

export function processResponsive(
	className: string | undefined,
	viewportWidth: number | undefined,
): string {
	if (!className) return "";

	const tokens = className.split(/\s+/).filter(Boolean);

	// If no viewport width, we can't process responsive classes, so we might just return everything
	// or filter them out. The previous behavior was to return everything if viewportWidth was undefined
	// in the initial check, but filter if it was defined.
	// Let's stick to: if viewportWidth is undefined, we return everything (or maybe just non-responsive?
	// The original code returned `className || ""` if `!className || viewportWidth === undefined`.
	if (viewportWidth === undefined) {
		return className;
	}

	const activeClasses = tokens.reduce<string[]>((acc, token) => {
		const match = token.match(responsivePattern);
		if (!match) {
			acc.push(token);
			return acc;
		}

		const [, maxPrefix, breakpoint, baseClass] = match;
		const threshold = BREAKPOINTS[breakpoint as keyof typeof BREAKPOINTS];
		const matches = maxPrefix
			? viewportWidth < threshold
			: viewportWidth >= threshold;

		if (matches) {
			acc.push(baseClass);
		}
		return acc;
	}, []);

	const mergedClasses = twMerge(activeClasses);

	return mergedClasses;
}

export function processGap(className: string): {
	style: CSSProperties;
	className: string;
} {
	const tokens = className.split(/\s+/).filter(Boolean);
	const style: CSSProperties = {};
	const remainingClasses: string[] = [];

	let hasGapX = false;
	let hasGapY = false;
	let gapValue: string | undefined;

	for (const token of tokens) {
		if (token.startsWith("gap-")) {
			const gapProps = parseGapClass(token);
			if (gapProps.gap) gapValue = gapProps.gap;
			if (gapProps.gapX) {
				hasGapX = true;
				style.columnGap = gapProps.gapX;
			}
			if (gapProps.gapY) {
				hasGapY = true;
				style.rowGap = gapProps.gapY;
			}
		} else {
			remainingClasses.push(token);
		}
	}

	if (gapValue) {
		if (hasGapX || hasGapY) {
			if (!hasGapX) style.columnGap = gapValue;
			if (!hasGapY) style.rowGap = gapValue;
		} else {
			style.gap = gapValue;
		}
	}

	return {
		style,
		className: remainingClasses.join(" "),
	};
}

export function processDither(className: string): {
	style: CSSProperties;
	className: string;
} {
	const tokens = className.split(/\s+/).filter(Boolean);
	const style: CSSProperties = {};
	const remainingClasses: string[] = [];

	for (const token of tokens) {
		if (token.startsWith("dither-")) {
			const ditherStyle = ditherPatterns[token];
			if (ditherStyle) {
				Object.assign(style, ditherStyle);
			} else {
				remainingClasses.push(token);
			}
		} else {
			remainingClasses.push(token);
		}
	}

	return {
		style,
		className: remainingClasses.join(" "),
	};
}
