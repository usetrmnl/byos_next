import type { Glyph, NewBitmapFontMetrics } from "./schema/v2";

const CAP_CHARS = /^[A-Z]$/;
const DESC_CHARS = /^[gjpqy]$/;
const X_HEIGHT_CHARS = /^[acemnorsuvxz]$/;

const glyphChar = (glyph: Glyph, key: string): string =>
	glyph.char?.length ? glyph.char : String.fromCharCode(glyph.charCode ?? Number(key));

/** Derive typographic metric lines from traced glyph ink (post-generation pass). */
export function shiftGlyphsToMetrics(
	glyphs: Record<string, Glyph>,
	metrics: NewBitmapFontMetrics,
): Record<string, Glyph> {
	let capMaxY = Number.NEGATIVE_INFINITY;

	for (const glyph of Object.values(glyphs)) {
		const char = glyph.char?.length
			? glyph.char
			: String.fromCharCode(glyph.charCode);
		if (!/^[A-Z]$/.test(char)) continue;
		capMaxY = Math.max(capMaxY, glyph.bounds?.maxY ?? Number.NEGATIVE_INFINITY);
		for (const row of glyph.rows) {
			capMaxY = Math.max(capMaxY, row.y);
		}
	}

	if (!Number.isFinite(capMaxY)) return glyphs;

	const deltaY = metrics.capHeightY - capMaxY;
	if (deltaY === 0) return glyphs;

	const shifted: Record<string, Glyph> = {};
	for (const [key, glyph] of Object.entries(glyphs)) {
		shifted[key] = {
			...glyph,
			bounds: {
				...glyph.bounds,
				minY: glyph.bounds.minY + deltaY,
				maxY: glyph.bounds.maxY + deltaY,
			},
			rows: glyph.rows.map((row) => ({ ...row, y: row.y + deltaY })),
		};
	}
	return shifted;
}

/** Derive typographic metric lines from traced glyph ink (post-generation pass). */
export function deriveTypographyMetrics(
	glyphs: Record<string, Glyph>,
	fallback: NewBitmapFontMetrics,
): NewBitmapFontMetrics {
	let inkMinY = Number.POSITIVE_INFINITY;
	let inkMaxY = Number.NEGATIVE_INFINITY;
	let capMaxY = Number.NEGATIVE_INFINITY;
	let descMinY = Number.POSITIVE_INFINITY;
	let xHeightMaxY = Number.NEGATIVE_INFINITY;

	for (const [key, glyph] of Object.entries(glyphs)) {
		if (!glyph.rows.length) continue;

		const char = glyphChar(glyph, key);
		const rowMinY = Math.min(...glyph.rows.map((row) => row.y));
		const rowMaxY = Math.max(...glyph.rows.map((row) => row.y));
		const boundsMinY = glyph.bounds?.minY ?? rowMinY;
		const boundsMaxY = glyph.bounds?.maxY ?? rowMaxY;

		inkMinY = Math.min(inkMinY, boundsMinY);
		inkMaxY = Math.max(inkMaxY, boundsMaxY);

		if (CAP_CHARS.test(char)) {
			capMaxY = Math.max(capMaxY, boundsMaxY);
		}
		if (DESC_CHARS.test(char)) {
			descMinY = Math.min(descMinY, boundsMinY);
		}
		if (X_HEIGHT_CHARS.test(char)) {
			xHeightMaxY = Math.max(xHeightMaxY, boundsMaxY);
		}
	}

	if (!Number.isFinite(inkMinY) || !Number.isFinite(inkMaxY)) {
		return fallback;
	}

	const accentPad = 1;
	const maxY = Number.isFinite(capMaxY)
		? capMaxY + accentPad
		: inkMaxY + accentPad;
	const minY = Number.isFinite(descMinY) ? descMinY : inkMinY;
	const xHeightY =
		Number.isFinite(xHeightMaxY) && xHeightMaxY > 0
			? xHeightMaxY
			: fallback.xHeightY;

	return {
		...fallback,
		minY,
		maxY,
		descenderY: Math.min(0, minY),
		capHeightY: maxY,
		xHeightY,
		baselineY: 0,
		lineGap: Math.max(
			fallback.lineGap,
			maxY - minY + 1,
		),
	};
}
