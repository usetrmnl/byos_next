// Types for the bitmap font structure
import {
	type BitmapFontMetrics,
	binaryToPath,
	getFontMetrics,
	getGlyphAdvance,
	getGlyphBitmapWidth,
	layoutBitmapText,
	layoutV2Text,
	parseGridSize,
	resolveV2Face,
	type NewBitmapFont,
} from "@/lib/bitmap-font";
import { isV2BitmapFont } from "@/lib/bitmap-font/pack-utils";

interface BitmapFontCharacter {
	charCode: number;
	char: string;
	data: string;
	width?: number;
	advance?: number;
}

interface BitmapFont {
	width: number;
	height: number;
	characters: BitmapFontCharacter[];
}

interface LegacyBitmapFontFile {
	metadata?: {
		metrics?: BitmapFontMetrics;
	};
	fonts: BitmapFont[];
}

type BitmapFontFile = LegacyBitmapFontFile | NewBitmapFont;

interface BitmapTextProps {
	text: string;
	fontData: BitmapFontFile | string;
	gridSize?: string;
	scale?: number;
	gap?: number;
	className?: string;
}

const base64ToBinary = (base64: string): string => {
	const binary = atob(base64);
	return Array.from(binary)
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("");
};

function parseFontData(fontData: BitmapFontFile | string): BitmapFontFile {
	if (typeof fontData === "string") {
		try {
			return JSON.parse(fontData) as BitmapFontFile;
		} catch (error) {
			console.error("Error parsing font data:", error);
			return { fonts: [] };
		}
	}
	return fontData;
}

function findMatchingFont(
	parsedFontData: LegacyBitmapFontFile,
	width: number,
	height: number,
): BitmapFont | null {
	const exactMatch = parsedFontData.fonts.find(
		(font) =>
			(font.width === width || (font.width === 0 && width === 0)) &&
			font.height === height,
	);
	if (exactMatch) return exactMatch;

	const heightMatch = parsedFontData.fonts.find((font) => font.height === height);
	if (heightMatch) return heightMatch;

	return parsedFontData.fonts[0] ?? null;
}

function createCharMap(selectedFont: BitmapFont | null): Map<number, string> {
	if (!selectedFont) return new Map<number, string>();

	const map = new Map<number, string>();
	selectedFont.characters.forEach((char: BitmapFontCharacter) => {
		map.set(char.charCode, base64ToBinary(char.data));
	});
	return map;
}

function createGlyphMetaMap(
	selectedFont: BitmapFont | null,
): Map<number, { width?: number; advance?: number }> {
	if (!selectedFont) return new Map();

	const map = new Map<number, { width?: number; advance?: number }>();
	selectedFont.characters.forEach((char) => {
		map.set(char.charCode, { width: char.width, advance: char.advance });
	});
	return map;
}

function BitmapText({
	text,
	fontData,
	gridSize = "8x8",
	scale = 1,
	gap = 0,
	className = "",
}: BitmapTextProps) {
	const parsedFontData = parseFontData(fontData);

	if (isV2BitmapFont(parsedFontData)) {
		const face = resolveV2Face(parsedFontData, gridSize);
		if (!face || !text) return null;

		const layout = layoutV2Text({
			text,
			glyphs: face.glyphs,
			metrics: face.metrics,
			gridWidth: face.gridWidth,
			scale,
			gap,
		});

		return (
			<svg
				width={layout.width}
				height={layout.height}
				viewBox={`0 0 ${layout.width} ${layout.height}`}
				className={className}
				style={{ maxWidth: "100%" }}
				role="img"
				aria-label={`Bitmap text: ${text}`}
			>
				{layout.lines.flatMap((line, lineIndex) =>
					line.paths.map((item, index) => (
						<g
							key={`${lineIndex}-${index}`}
							transform={`translate(${item.x}, ${item.y}) scale(${scale})`}
						>
							<path d={item.path} fill="currentColor" />
						</g>
					)),
				)}
			</svg>
		);
	}

	const legacyPack = parsedFontData as LegacyBitmapFontFile;
	const [width, height] = parseGridSize(gridSize);
	const selectedFont = findMatchingFont(legacyPack, width, height);
	const charMap = createCharMap(selectedFont);
	const glyphMeta = createGlyphMetaMap(selectedFont);
	const metrics = getFontMetrics(
		legacyPack,
		selectedFont ?? { width: 0, height: 0, characters: [] },
	);

	if (!selectedFont || !text) {
		return null;
	}

	const layout = layoutBitmapText({
		text,
		font: selectedFont,
		charMap,
		glyphMeta,
		metrics,
		scale,
		gap,
	});

	return (
		<svg
			width={layout.width}
			height={layout.height}
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			className={className}
			style={{ maxWidth: "100%" }}
			role="img"
			aria-label={`Bitmap text: ${text}`}
		>
			{layout.lines.flatMap((line, lineIndex) =>
				line.paths.map((item, index) => (
					<g
						key={`${lineIndex}-${index}`}
						transform={`translate(${item.x}, ${item.y}) scale(${scale})`}
					>
						<path d={item.path} fill="currentColor" />
					</g>
				)),
			)}
		</svg>
	);
}

export { BitmapText, binaryToPath, getGlyphAdvance, getGlyphBitmapWidth };
export type { BitmapFontMetrics };
