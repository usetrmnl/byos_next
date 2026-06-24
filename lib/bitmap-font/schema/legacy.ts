export type LegacyFontMetrics = {
	renderSize?: number;
	cellHeight: number;
	cellWidth?: number;
	capTop: number;
	baselineRow: number;
	descenderDepth: number;
	xHeight: number;
	lineHeight: number;
	pixelUnit?: number;
	pixelUnitX?: number;
	pixelUnitY?: number;
	dynamicWidth?: boolean;
};

export type LegacyBitmapCharacter = {
	charCode: number;
	char: string;
	data: string;
	width?: number;
	advance?: number;
};

export type LegacyBitmapFace = {
	width: number;
	height: number;
	characters: LegacyBitmapCharacter[];
};

export type LegacyBitmapFontPack = {
	metadata?: {
		name?: string;
		creator?: string;
		createdAt?: string;
		version?: string;
		description?: string;
		metrics?: LegacyFontMetrics;
		[key: string]: unknown;
	};
	fonts: LegacyBitmapFace[];
};
