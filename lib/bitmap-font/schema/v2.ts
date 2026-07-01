export type NewBitmapFontMetrics = {
	minY: number;
	descenderY: number;
	baselineY: number;
	xHeightY: number;
	capHeightY: number;
	maxY: number;
	lineGap: number;
	/** Extra pixels between glyphs when rendering text (scaled at layout time). */
	defaultCharGap?: number;
	pixelUnitX: number;
	pixelUnitY: number;
	dynamicWidth: boolean;
};

export type GlyphBounds = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

export type GlyphRowRun = {
	y: number;
	runs: number[][];
};

export type Glyph = {
	charCode: number;
	char: string;
	width: number;
	advance: number;
	leftBearing: number;
	bounds: GlyphBounds;
	rows: GlyphRowRun[];
};

export type NewBitmapFontFace = {
	metrics?: NewBitmapFontMetrics;
	glyphs: Record<string, Glyph>;
};

export type NewBitmapFont = {
	metadata: {
		name: string;
		creator?: string;
		createdAt?: string;
		version: string;
		description?: string;
		metrics: NewBitmapFontMetrics;
	};
	/** Single-grid packs use top-level glyphs. Multi-grid packs use `faces`. */
	glyphs?: Record<string, Glyph>;
	faces?: Record<string, NewBitmapFontFace>;
};
