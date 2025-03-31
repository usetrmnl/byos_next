// Types for the bitmap font structure
interface BitmapFontCharacter {
	charCode: number;
	char: string;
	data: string;
}

interface BitmapFont {
	width: number;
	height: number;
	characters: BitmapFontCharacter[];
}

interface BitmapFontFile {
	metadata?: {
		name: string;
		creator: string;
		createdAt: string;
		version: string;
		description: string;
	};
	fonts: BitmapFont[];
}

interface BitmapTextProps {
	text: string;
	fontData: BitmapFontFile | string;
	gridSize?: string;
	scale?: number;
	gap?: number;
	className?: string;
}

// Utility function to convert base64 to binary string
const base64ToBinary = (base64: string): string => {
	// Decode base64 to binary
	const binary = atob(base64);
	// Convert each byte to its binary representation
	return Array.from(binary)
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("");
};

// Helper functions for bitmap processing
function parseGridSize(gridSize: string): [number, number] {
	const [w, h] = gridSize.split("x").map(Number);
	return [w, h];
}

function parseFontData(fontData: BitmapFontFile | string): BitmapFontFile {
	if (typeof fontData === "string") {
		try {
			return JSON.parse(fontData);
		} catch (error) {
			console.error("Error parsing font data:", error);
			return { fonts: [] };
		}
	}
	return fontData;
}

function findMatchingFont(
	parsedFontData: BitmapFontFile,
	width: number,
	height: number,
): BitmapFont | null {
	// Try to find exact match first
	const exactMatch = parsedFontData.fonts.find(
		(font) => font.width === width && font.height === height,
	);

	if (exactMatch) return exactMatch;

	// If no exact match, return the first font if available
	if (parsedFontData.fonts.length > 0) {
		return parsedFontData.fonts[0];
	}

	return null;
}

function createCharMap(selectedFont: BitmapFont | null): Map<number, string> {
	if (!selectedFont) return new Map<number, string>();

	const map = new Map<number, string>();
	selectedFont.characters.forEach((char: BitmapFontCharacter) => {
		map.set(char.charCode, base64ToBinary(char.data));
	});

	return map;
}

function generateSvgData(
	text: string,
	selectedFont: BitmapFont | null,
	charMap: Map<number, string>,
	scale: number,
	gap: number,
) {
	if (!selectedFont) return { width: 0, height: 0, paths: [] };

	const fontWidth = selectedFont.width;
	const fontHeight = selectedFont.height;
	const charWidth = fontWidth * scale;
	const charHeight = fontHeight * scale;
	const spaceWidth = fontWidth * scale * 0.5; // Space width is half a character
	const gapWidth = gap;

	// Calculate total width and generate paths
	let totalWidth = 0;
	const paths: { path: string; x: number }[] = [];

	// Process each character in the text
	Array.from(text).forEach((char) => {
		const charCode = char.charCodeAt(0);

		// Handle spaces
		if (char === " ") {
			totalWidth += spaceWidth;
			return;
		}

		// Get the bitmap data for this character
		const binaryString = charMap.get(charCode);

		if (!binaryString) {
			// If no data, just add the width
			totalWidth += charWidth;
			return;
		}

		// Generate path for this character
		const binaryArray = binaryString
			.padEnd(fontWidth * fontHeight, "0")
			.slice(0, fontWidth * fontHeight);
		const pathData = Array.from({ length: fontWidth * fontHeight })
			.map((_, i) => {
				if (i >= binaryArray.length) return "";
				const isBlack = binaryArray[i] === "1";
				if (!isBlack) return "";
				const x = i % fontWidth;
				const y = Math.floor(i / fontWidth);
				return `M ${x} ${y} h 1 v 1 h -1 z`;
			})
			.join(" ");

		// Add path with position
		paths.push({
			path: pathData,
			x: totalWidth,
		});

		// Increase total width
		totalWidth += charWidth;
		totalWidth += gapWidth; // Add gap after each character
	});

	return {
		width: totalWidth > 0 ? totalWidth : 100, // Minimum width if no text
		height: charHeight,
		paths,
	};
}

function BitmapText({
	text,
	fontData,
	gridSize = "8x8",
	scale = 1,
	gap = 0,
	className = "",
}: BitmapTextProps) {
	// Parse font data and calculate properties without useMemo
	const parsedFontData = parseFontData(fontData);
	const [width, height] = parseGridSize(gridSize);
	const selectedFont = findMatchingFont(parsedFontData, width, height);
	const charMap = createCharMap(selectedFont);
	const svgData = generateSvgData(text, selectedFont, charMap, scale, gap);

	// If there's no font data or the text is empty, show nothing
	if (!selectedFont || !text) {
		return null;
	}

	return (
		<svg
			width={svgData.width}
			height={svgData.height}
			viewBox={`0 0 ${svgData.width} ${svgData.height}`}
			className={className}
			style={{ maxWidth: "100%" }}
		>
			{svgData.paths.map((item: { path: string; x: number }, index: number) => (
				<g key={index} transform={`translate(${item.x}, 0) scale(${scale})`}>
					<path d={item.path} fill="currentColor" />
				</g>
			))}
		</svg>
	);
}

// Export BitmapTextServer from its dedicated file
// export { BitmapTextServer } from './bitmap-text-server';

export { BitmapText };
