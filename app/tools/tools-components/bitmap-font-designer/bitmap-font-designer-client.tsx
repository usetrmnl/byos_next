"use client";

import bitmapFontFile from "@/components/bitmap-font/bitmap-font.json";
import {
	useRef,
	useState,
	useEffect,
	useCallback,
	memo,
	useMemo,
	useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddGridSize from "./add-grid-size";
import BitmapFontEditor from "./bitmap-font-editor";
import { base64ToBinary, binaryToBase64 } from "./bitmap-font-utils";
import { Download, Info, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
}

const bitmapFont = bitmapFontFile.fonts;

export interface BitmapFontCharacter {
	charCode: number;
	char: string;
	data: string;
}

export interface BitmapFont {
	width: number;
	height: number;
	characters: BitmapFontCharacter[];
}

// Basic ASCII (32-126)
export const basicAsciiSet = Array.from({ length: 95 }, (_, i) => ({
	charCode: i + 32,
}));

// Latin-1 Supplement (only useful printable range)
const commonLatin1 = [
	160, // Non-breaking space
	161,
	162,
	163,
	165,
	166,
	167,
	169, // ¡ ¢ £ ¥ ¦ § ©
	171,
	172,
	174,
	176,
	177,
	181,
	182,
	183, // « ¬ ® ° ± µ ¶ ·
	187,
	188,
	189,
	190, // » ¼ ½ ¾
	192,
	193,
	194,
	195,
	196,
	197,
	198,
	199,
	200,
	201,
	202,
	203,
	210,
	211,
	212,
	213,
	214,
	216,
	217,
	218,
	219,
	220,
	223, // ß
	224,
	225,
	226,
	227,
	228,
	229,
	230,
	231,
	232,
	233,
	234,
	235,
	241,
	242,
	243,
	244,
	245,
	246,
	248,
	249,
	250,
	251,
	252,
	253,
	255,
];
export const latin1Set = commonLatin1.map((charCode) => ({ charCode }));

// Greek (subset for scientific symbols)
const commonGreek = [
	913,
	914,
	915,
	916,
	920,
	923,
	926,
	928,
	931,
	934,
	936,
	937, // capitals
	945,
	946,
	947,
	948,
	949,
	950,
	951,
	952,
	955,
	960,
	961,
	964,
	965,
	966,
	967,
	968,
	969, // lower
];
export const greekSet = commonGreek.map((charCode) => ({ charCode }));

// Cyrillic (1024-1279)
export const cyrillicSet = Array.from({ length: 256 }, (_, i) => ({
	charCode: i + 1024,
}));

// Symbols and Emojis
const commonSymbols = [
	// Smart quotes
	8211, // – en dash
	8212, // — em dash
	8216, // ‘ left single quotation
	8217, // ’ right single quotation ← U+2019, your priority
	8220, // “ left double quotation
	8221, // ” right double quotation
	8230, // … ellipsis
	8226, // • bullet
	8242,
	8243, // ′ ″ (prime and double prime)
	8250, // ›

	// Arrows (U+2190–U+21FF)
	...Array.from({ length: 96 }, (_, i) => 0x2190 + i), // ← to ⇿

	// Common UI symbols
	10003, // ✓
	10005, // ✗
	9733,
	9734, // ★ ☆
	9745, // ☑
	9755,
	9757, // ☛ ☝
	9786, // ☺
	9829, // ♥
	9888, // ⚠
];
export const symbolsSet = commonSymbols.map((charCode) => ({ charCode }));

// generate all char codes in Basic ASCII, Latin-1, Greek, Cyrillic, Symbols
const charCodesGroups = [
	{ name: "Basic ASCII", charCodes: basicAsciiSet },
	{ name: "Latin-1 Supplement", charCodes: latin1Set },
	{ name: "Greek and Coptic", charCodes: greekSet },
	{ name: "Cyrillic", charCodes: cyrillicSet },
	{ name: "Symbols and Pictographs", charCodes: symbolsSet },
];

// Constants for grid layout
const ITEM_WIDTH = 40;
const ITEM_HEIGHT = 60;

// Create a flat array of all characters
const allCharacters = charCodesGroups.flatMap((group) => group.charCodes);

interface Character {
	charCode: number;
}

// Combined CharacterItem component with BinaryToSvg functionality
const CharacterItem = memo(
	({
		charCode,
		charData,
		onCharacterClick,
		selectedGridSize,
		isSelected = false,
	}: {
		charCode: number;
		charData: string;
		onCharacterClick: (e: React.MouseEvent<HTMLDivElement>) => void;
		selectedGridSize: string;
		isSelected?: boolean;
	}) => {
		const [width, height] = selectedGridSize.split("x").map(Number);

		// Render SVG content inline instead of using a separate component
		const renderSvgContent = () => {
			if (!charData && charCode != 32) {
				return (
					<div className="size-5 border border-gray-200 dark:border-gray-600 border-dashed flex items-center justify-center">
						{String.fromCharCode(charCode)}
					</div>
				);
			}

			try {
				// Use binary string directly, ensure it's the right length
				const binaryArray = charData
					.padEnd(width * height, "0")
					.slice(0, width * height);

				// Create a single path element instead of multiple rects
				const pathData = Array.from({ length: width * height })
					.map((_, i) => {
						if (i >= binaryArray.length) return "";
						const isBlack = binaryArray[i] === "1";
						if (!isBlack) return "";
						const x = i % width;
						const y = Math.floor(i / width);
						return `M ${x} ${y} h 1 v 1 h -1 z`;
					})
					.join(" ");

				return (
					<svg
						className="w-full h-full dark:invert border-[0.5px] border-gray-200 dark:border-gray-600"
						width={width}
						height={height}
						viewBox={`0 0 ${width} ${height}`}
					>
						<path d={pathData} fill="black" />
					</svg>
				);
			} catch (error) {
				console.error("Error processing binary:", error);
				return (
					<div className="size-5 border border-gray-200 dark:border-gray-600 border-dashed flex items-center justify-center text-xs">
						?
					</div>
				);
			}
		};

		return (
			<div
				className={cn(
					"flex flex-col items-center justify-between border p-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
					isSelected && "bg-blue-100 dark:bg-blue-900 border-blue-500",
				)}
				style={{
					width: `${ITEM_WIDTH}px`,
					height: `${ITEM_HEIGHT}px`,
					padding: "4px",
				}}
				onClick={onCharacterClick}
				data-char-code={charCode}
				tabIndex={0}
				aria-label={`Character ${String.fromCharCode(charCode)}`}
				onKeyDown={(e) =>
					e.key === "Enter" &&
					onCharacterClick(e as unknown as React.MouseEvent<HTMLDivElement>)
				}
			>
				<span className="text-sm mb-1 font-mono">
					{String.fromCharCode(charCode)}
				</span>
				<div className="flex-1 flex items-center justify-center">
					{renderSvgContent()}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.selectedGridSize === nextProps.selectedGridSize &&
			prevProps.isSelected === nextProps.isSelected &&
			prevProps.charCode === nextProps.charCode &&
			prevProps.charData === nextProps.charData
		);
	},
);

CharacterItem.displayName = "CharacterItem";

const CharacterGrid = ({
	selectedGridSize,
	onCharacterSelect,
	selectedCharCode,
	characterBitmaps,
	currentCharacterBitmap,
}: {
	selectedGridSize: string;
	onCharacterSelect: (charCode: string) => void;
	selectedCharCode: number;
	characterBitmaps: Map<number, string>;
	currentCharacterBitmap: string | null;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);

	// Scroll to selected character when it changes
	useEffect(() => {
		if (!containerRef.current || !selectedCharCode) return;

		const selectedElement = containerRef.current.querySelector(
			`[data-char-code="${selectedCharCode}"]`,
		);
		if (selectedElement) {
			selectedElement.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
			});
		}
	}, [selectedCharCode]);

	const handleCharacterClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const charCode = e.currentTarget.dataset.charCode;
			if (!charCode) return;
			onCharacterSelect(charCode);
		},
		[onCharacterSelect],
	);

	return (
		<div
			ref={containerRef}
			className="w-full overflow-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 h-[32vh]"
		>
			<div className="flex flex-wrap gap-1 p-1">
				{allCharacters.map((char: Character) =>
					char.charCode === selectedCharCode ? (
						<CharacterItem
							key={char.charCode}
							charCode={char.charCode}
							onCharacterClick={handleCharacterClick}
							charData={currentCharacterBitmap ?? ""}
							selectedGridSize={selectedGridSize}
							isSelected={true}
						/>
					) : (
						<CharacterItem
							key={char.charCode}
							charCode={char.charCode}
							onCharacterClick={handleCharacterClick}
							charData={characterBitmaps.get(char.charCode) ?? ""}
							selectedGridSize={selectedGridSize}
						/>
					),
				)}
			</div>
		</div>
	);
};

CharacterGrid.displayName = "CharacterGrid";

// Preview sentence component memoized to avoid unnecessary re-renders - stateless version
const SentencePreview = memo(
	({
		characterBitmaps,
		selectedGridSize,
		previewText,
		previewScale,
		previewGap,
		selectedCharCode,
		currentCharacterBitmap,
		onPreviewTextChange,
		onPreviewScaleChange,
		onPreviewGapChange,
	}: {
		characterBitmaps: Map<number, string>;
		selectedGridSize: string;
		previewText: string;
		previewScale: number;
		previewGap: number;
		selectedCharCode: number;
		currentCharacterBitmap: string | null;
		onPreviewTextChange: (newPreviewText: string) => void;
		onPreviewScaleChange: (newScale: number) => void;
		onPreviewGapChange: (newGap: number) => void;
	}) => {
		const [width, height] = selectedGridSize.split("x").map(Number);
		const charMap = characterBitmaps;
		const uniqueChars = new Set(Array.from(previewText)).size;

		// State for the input field to prevent jank during typing
		const [inputValue, setInputValue] = useState(previewText);

		// Update local input state when previewText prop changes
		useEffect(() => {
			setInputValue(previewText);
		}, [previewText]);

		// Debounce the input to avoid performance issues when typing quickly
		const debouncedInputValue = useDebounce(inputValue, 300);

		// Update the parent state when debounced value changes
		useEffect(() => {
			if (debouncedInputValue !== previewText) {
				onPreviewTextChange(debouncedInputValue);
			}
		}, [debouncedInputValue, onPreviewTextChange, previewText]);

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setInputValue(e.target.value);
		};

		const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onPreviewScaleChange(parseFloat(e.target.value));
		};

		const handleGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onPreviewGapChange(parseInt(e.target.value, 10));
		};

		// Count how many characters have bitmap data defined
		const definedChars = useMemo(() => {
			if (!charMap) return 0;
			return Array.from(previewText).filter(
				(char) => char !== " " && charMap.has(char.charCodeAt(0)),
			).length;
		}, [previewText, charMap]);

		// Calculate SVG dimensions
		const svgData = useMemo(() => {
			const charWidth = width * previewScale;
			const charHeight = height * previewScale;
			const spaceWidth = width * previewScale * 0.5; // Space width is half a character
			const gapWidth = previewGap;

			// Calculate total width by summing all character widths + gaps
			let totalWidth = 0;
			const paths: {
				path: string;
				x: number;
				charCode: number;
				isSelected: boolean;
			}[] = [];

			// Process each character
			Array.from(previewText).forEach((char) => {
				const charCode = char.charCodeAt(0);

				// Handle spaces
				if (char === " ") {
					totalWidth += spaceWidth;
					return;
				}

				// Check if this is the selected character
				const isSelected = charCode === selectedCharCode;

				// Get the correct bitmap data
				// Use currentCharacterBitmap for selected char, or from the main map for others
				const binaryString =
					isSelected && currentCharacterBitmap
						? currentCharacterBitmap
						: charMap?.get(charCode);

				if (!binaryString) {
					// If no data, just add the width
					totalWidth += charWidth;
					return;
				}

				// Generate path for this character
				const binaryArray = binaryString
					.padEnd(width * height, "0")
					.slice(0, width * height);
				const pathData = Array.from({ length: width * height })
					.map((_, i) => {
						if (i >= binaryArray.length) return "";
						const isBlack = binaryArray[i] === "1";
						if (!isBlack) return "";
						const x = i % width;
						const y = Math.floor(i / width);
						return `M ${x} ${y} h 1 v 1 h -1 z`;
					})
					.join(" ");

				// Add path with position
				paths.push({
					path: pathData,
					x: totalWidth,
					charCode,
					isSelected,
				});

				// Increase total width
				totalWidth += charWidth;
				totalWidth += gapWidth; // Add gap after each character
			});

			return {
				width: totalWidth,
				height: charHeight,
				paths,
				charWidth,
				charHeight,
			};
		}, [
			previewText,
			charMap,
			width,
			height,
			previewScale,
			previewGap,
			selectedCharCode,
			currentCharacterBitmap,
		]);

		return (
			<div className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-md">
				<div className="flex justify-between items-center mb-3">
					<h3 className="text-sm font-medium">Preview</h3>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
									<Info className="w-4 h-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>
									Characters with defined bitmap data: {definedChars} /{" "}
									{previewText.length - previewText.split(" ").length + 1}
								</p>
								<p>Preview of how the bitmap font renders text</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				{/* Input field with debounce */}
				<div className="mb-3">
					<Input
						type="text"
						value={inputValue}
						onChange={handleInputChange}
						placeholder="Type a custom preview sentence..."
						className="w-full"
						aria-label="Preview sentence"
					/>
				</div>

				{/* Slider controls */}
				<div className="flex gap-4 items-center justify-end mb-3 text-sm">
					<div className="flex items-center gap-2">
						<label
							htmlFor="preview-scale"
							className="text-xs whitespace-nowrap"
						>
							Scale:
						</label>
						<input
							id="preview-scale"
							type="range"
							min="1"
							max="3"
							step="0.25"
							value={previewScale}
							onChange={handleScaleChange}
							className="w-24"
						/>
						<span className="text-xs">{previewScale.toFixed(2)}x</span>
					</div>
					<div className="flex items-center gap-2">
						<label htmlFor="preview-gap" className="text-xs whitespace-nowrap">
							Gap:
						</label>
						<input
							id="preview-gap"
							type="range"
							min="0"
							max="5"
							step="1"
							value={previewGap}
							onChange={handleGapChange}
							className="w-24"
						/>
						<span className="text-xs">{previewGap}px</span>
					</div>
				</div>

				<div className="overflow-x-auto pb-2 border-b border-gray-100 dark:border-gray-800">
					<svg
						width={svgData.width}
						height={svgData.height}
						viewBox={`0 0 ${svgData.width} ${svgData.height}`}
						className="dark:invert"
					>
						{svgData.paths.map((item, index) => (
							<g
								key={index}
								transform={`translate(${item.x}, 0) scale(${previewScale})`}
							>
								<path d={item.path} fill={"black"} />
							</g>
						))}
					</svg>
				</div>
				<div className="flex justify-between items-center mt-2">
					<div className="text-xs text-gray-500">
						Font size: {selectedGridSize}
					</div>
					<div className="text-xs text-gray-500">
						{previewText.length} characters ({uniqueChars} unique)
					</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// Custom comparison to avoid unnecessary re-renders
		// Only re-render if these specific props change
		return (
			prevProps.selectedGridSize === nextProps.selectedGridSize &&
			prevProps.previewText === nextProps.previewText &&
			prevProps.previewScale === nextProps.previewScale &&
			prevProps.previewGap === nextProps.previewGap &&
			prevProps.selectedCharCode === nextProps.selectedCharCode &&
			prevProps.currentCharacterBitmap === nextProps.currentCharacterBitmap
		);
	},
);

SentencePreview.displayName = "SentencePreview";

// Component for loading font data from file
const FontFileLoader = memo(
	({
		onLoadFont,
	}: {
		onLoadFont: (fontData: { fonts: BitmapFont[] }) => void;
	}) => {
		const fileInputRef = useRef<HTMLInputElement>(null);

		const handleClick = () => {
			if (fileInputRef.current) {
				fileInputRef.current.click();
			}
		};

		const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				try {
					const jsonData = JSON.parse(event.target?.result as string);
					onLoadFont(jsonData);

					// Reset the input so the same file can be uploaded again
					if (fileInputRef.current) {
						fileInputRef.current.value = "";
					}
				} catch (error) {
					console.error("Error parsing JSON font file:", error);
					alert("Invalid font file format. Please upload a valid JSON file.");
				}
			};
			reader.readAsText(file);
		};

		return (
			<div>
				<input
					type="file"
					ref={fileInputRef}
					accept=".json"
					onChange={handleFileChange}
					className="hidden"
					aria-label="Load font file"
				/>
				<Button
					onClick={handleClick}
					variant="outline"
					size="sm"
					className="flex items-center gap-1"
				>
					<Upload className="w-4 h-4" />
					<span>Load Font</span>
				</Button>
			</div>
		);
	},
	() => true,
); // Always consider equal to prevent unnecessary re-renders

FontFileLoader.displayName = "FontFileLoader";

export default function BitmapFontDesignerClient() {
	// Process and organize font data into a structured map for efficient access
	// Format: { "8x8": Map(65 => "10101010..."), "16x16": Map(65 => "10101010..."), ... }
	const initialFontDataObj = useMemo(() => {
		const fontDataObj: { [fontSize: string]: Map<number, string> } = {};
		bitmapFont.map((font) => {
			const fontSizeKey = `${font.width}x${font.height}`;
			const characterBitmapMap = new Map<number, string>();
			font.characters.forEach((char) => {
				// Convert base64 encoded data to binary string representation (1s and 0s)
				characterBitmapMap.set(char.charCode, base64ToBinary(char.data));
			});
			fontDataObj[fontSizeKey] = characterBitmapMap;
		});
		return fontDataObj;
	}, []);

	// Create a ref to store the font data to avoid dependency issues in callbacks
	const fontDataRef = useRef(initialFontDataObj);
	// Keep the ref updated with the initial value
	fontDataRef.current = initialFontDataObj;

	// Available grid sizes extracted from the font data (e.g., ["8x8", "16x16"])
	const [availableGridSizes, setAvailableGridSizes] = useState(
		bitmapFont.map((font) => `${font.width}x${font.height}`),
	);

	// Currently selected grid size (e.g., "8x8")
	const [selectedGridSize, setSelectedGridSize] = useState<string>("7x8");

	// Currently selected character (default: 'A' which has charCode 65)
	const [selectedCharCode, setSelectedCharCode] = useState<number>(65);

	// Text used for previewing the font
	const [previewText, setPreviewText] = useState(
		"Hello World! The quick brown fox jumps over the lazy dog.",
	);

	// Preview display settings
	const [previewScale, setPreviewScale] = useState(2); // Size multiplier
	const [previewGap, setPreviewGap] = useState(0); // Space between characters

	// Map of all character bitmap data for the current grid size
	const [characterBitmaps, setCharacterBitmaps] = useState<Map<number, string>>(
		initialFontDataObj[selectedGridSize] ?? new Map(),
	);

	// Bitmap data for the currently selected character
	const [currentCharacterBitmap, setCurrentCharacterBitmap] = useState<
		string | null
	>(characterBitmaps.get(selectedCharCode) ?? null);

	const [, startTransition] = useTransition();

	// Handle adding a new grid size
	const handleAddSize = useCallback((newSize: string) => {
		// Create a new entry in the initialFontDataObj for this size
		if (!fontDataRef.current[newSize]) {
			fontDataRef.current[newSize] = new Map<number, string>();
		}

		// Update the availableGridSizes list
		setAvailableGridSizes((prev) => {
			const newSizes = [...prev, newSize].sort(
				(a, b) => parseInt(a.split("x")[0]) - parseInt(b.split("x")[0]),
			);
			return newSizes;
		});

		// Switch to the new grid size
		setSelectedGridSize(newSize);

		// Update character bitmaps for the new size
		setCharacterBitmaps(fontDataRef.current[newSize]);

		// Update current character bitmap
		setCurrentCharacterBitmap(null);
	}, []);

	const handleDataChange = useCallback(
		(newBinaryData: string, charCode: number) => {
			// Update state for rerender, then update global data non-blockingly using useTransition
			startTransition(() => {
				// Update both the maps and current character data
				characterBitmaps.set(charCode, newBinaryData);

				// Ensure the map exists before trying to set a value on it
				if (!fontDataRef.current[selectedGridSize]) {
					fontDataRef.current[selectedGridSize] = new Map<number, string>();
				}

				fontDataRef.current[selectedGridSize].set(charCode, newBinaryData);

				// If this is the currently selected character, update its bitmap too
				if (charCode === selectedCharCode) {
					setCurrentCharacterBitmap(newBinaryData);
				}
			});
		},
		[selectedGridSize, selectedCharCode, characterBitmaps],
	);

	const handleSizeChange = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const size = e.currentTarget.dataset.size;
			if (!size) return;

			// Update grid size
			setSelectedGridSize(size);

			// Ensure the font data object has an entry for this size
			if (!fontDataRef.current[size]) {
				fontDataRef.current[size] = new Map<number, string>();
			}

			// Get the character maps for this size
			const newCharacterBitmaps = fontDataRef.current[size] ?? new Map();
			setCharacterBitmaps(newCharacterBitmaps);

			// Update the current character bitmap for the selected character in the new size
			setCurrentCharacterBitmap(
				newCharacterBitmaps.get(selectedCharCode) ?? null,
			);
		},
		[selectedCharCode],
	);

	const handleCharacterSelect = useCallback(
		(charCode: string) => {
			const newCharCode = parseInt(charCode);
			setSelectedCharCode(newCharCode);
			// Update the current character bitmap when selecting a new character
			setCurrentCharacterBitmap(characterBitmaps.get(newCharCode) ?? null);
		},
		[characterBitmaps],
	);

	const handlePreviewTextChange = useCallback((newPreviewText: string) => {
		setPreviewText(newPreviewText);
	}, []);

	const handlePreviewScaleChange = useCallback((newScale: number) => {
		setPreviewScale(newScale);
	}, []);

	const handlePreviewGapChange = useCallback((newGap: number) => {
		setPreviewGap(newGap);
	}, []);

	// Function to load font data from uploaded JSON file
	const loadFontData = useCallback(
		(fontData: { fonts: BitmapFont[] }) => {
			try {
				// Validate that the file has the expected structure
				if (!fontData.fonts || !Array.isArray(fontData.fonts)) {
					throw new Error("Invalid font data format: missing 'fonts' array");
				}

				// Create a new object to replace initialFontDataObj
				const newFontDataObj: { [fontSize: string]: Map<number, string> } = {};

				// Create a new set of font sizes
				const newGridSizes: string[] = [];

				// Process each font in the uploaded file
				fontData.fonts.forEach((font: BitmapFont) => {
					if (
						typeof font.width !== "number" ||
						typeof font.height !== "number" ||
						!Array.isArray(font.characters)
					) {
						throw new Error("Invalid font data structure");
					}

					const fontSizeKey = `${font.width}x${font.height}`;
					newGridSizes.push(fontSizeKey);

					// Create a new map for this font size
					const characterBitmapMap = new Map<number, string>();

					// Process each character in the font
					font.characters.forEach((char: BitmapFontCharacter) => {
						if (
							typeof char.charCode !== "number" ||
							typeof char.data !== "string"
						) {
							throw new Error("Invalid character data structure");
						}

						// Convert base64 to binary representation
						characterBitmapMap.set(char.charCode, base64ToBinary(char.data));
					});

					// Add this font size to the new font data object
					newFontDataObj[fontSizeKey] = characterBitmapMap;
				});

				// Replace the initialFontDataObj with the new data
				Object.keys(fontDataRef.current).forEach((key) => {
					delete fontDataRef.current[key];
				});

				// Copy new data to initialFontDataObj
				Object.keys(newFontDataObj).forEach((key) => {
					fontDataRef.current[key] = newFontDataObj[key];
				});

				// Update application state
				setAvailableGridSizes(newGridSizes);

				// Set the first font size as selected if available, otherwise keep current
				if (newGridSizes.length > 0) {
					const firstSize = newGridSizes[0];
					setSelectedGridSize(firstSize);

					// Update character bitmaps for the new selected size
					const newCharacterBitmaps =
						fontDataRef.current[firstSize] ?? new Map();
					setCharacterBitmaps(newCharacterBitmaps);

					// Update current character bitmap
					setCurrentCharacterBitmap(
						newCharacterBitmaps.get(selectedCharCode) ?? null,
					);
				}

				// Show success notification
				toast.success("Font data loaded successfully!");
			} catch (error) {
				console.error("Error loading font data:", error);
				toast.error(
					`Failed to load font data: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		},
		[selectedCharCode],
	);

	// Function to save the font data to JSON
	const saveFontData = useCallback(() => {
		// Get the latest character maps from the local state object
		const fontDataToSave = availableGridSizes
			.map((size) => {
				const [width, height] = size.split("x").map(Number);
				const charMap = fontDataRef.current[size] || new Map();

				// Make sure to use the latest data for the current grid size
				const currentMap =
					size === selectedGridSize ? characterBitmaps : charMap;

				// Special handling for current character being edited
				if (
					size === selectedGridSize &&
					currentCharacterBitmap &&
					selectedCharCode
				) {
					currentMap.set(selectedCharCode, currentCharacterBitmap);
				}

				return {
					width,
					height,
					characters: Array.from(currentMap.entries())
						.filter(
							([, binaryString]) => binaryString && binaryString.includes("1"),
						) // Only include non-empty characters
						.map(([charCode, binaryString]) => ({
							charCode,
							char: String.fromCharCode(charCode),
							// Convert binary string to base64 for storage
							data: binaryToBase64(binaryString),
						}))
						.sort((a, b) => a.charCode - b.charCode), // Sort by charCode in ascending order
				};
			})
			.filter((font) => font.characters.length > 0); // Only include fonts with characters

		// Add metadata to the exported font
		const exportData = {
			metadata: {
				name: "Bitmap Font",
				creator: "Bitmap Font Designer",
				createdAt: new Date().toISOString(),
				version: "1.0",
				description: "Custom bitmap font created with Bitmap Font Designer",
			},
			fonts: fontDataToSave,
		};

		// Create a JSON string with the font data
		const jsonData = JSON.stringify(exportData, null, 2);

		// Create a meaningful filename with date
		const date = new Date();
		const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
		const timeStr = `${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}`;
		const filename = `bitmap-font-${dateStr}-${timeStr}.json`;

		// Create a download link for the data
		const blob = new Blob([jsonData], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();

		// Clean up
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 0);
	}, [
		availableGridSizes,
		selectedGridSize,
		characterBitmaps,
		currentCharacterBitmap,
		selectedCharCode,
	]);

	return (
		<div className="w-full flex flex-col gap-4">
			<div className="flex flex-wrap gap-2 mb-4 justify-between">
				<div className="flex flex-wrap gap-2">
					{availableGridSizes.map((size) => (
						<Button
							key={size}
							variant="outline"
							className={cn(
								selectedGridSize === size && "bg-blue-500 hover:bg-blue-600",
							)}
							onClick={handleSizeChange}
							data-size={size}
							size="sm"
						>
							{size}
						</Button>
					))}
					<AddGridSize
						availableGridSizes={availableGridSizes}
						onAddSize={handleAddSize}
					/>
				</div>
				<div className="flex gap-2">
					<FontFileLoader onLoadFont={loadFontData} />
					<Button
						onClick={saveFontData}
						variant="outline"
						size="sm"
						className="flex items-center gap-1"
						title="Save font data"
					>
						<Download className="w-4 h-4" />
						<span>Save Font</span>
					</Button>
				</div>
			</div>

			<CharacterGrid
				selectedGridSize={selectedGridSize}
				onCharacterSelect={handleCharacterSelect}
				selectedCharCode={selectedCharCode}
				characterBitmaps={characterBitmaps}
				currentCharacterBitmap={currentCharacterBitmap}
			/>

			<div className="space-y-2">
				<SentencePreview
					characterBitmaps={characterBitmaps}
					selectedGridSize={selectedGridSize}
					previewText={previewText}
					previewScale={previewScale}
					previewGap={previewGap}
					selectedCharCode={selectedCharCode}
					currentCharacterBitmap={currentCharacterBitmap}
					onPreviewTextChange={handlePreviewTextChange}
					onPreviewScaleChange={handlePreviewScaleChange}
					onPreviewGapChange={handlePreviewGapChange}
				/>
			</div>

			<div className="w-full">
				<BitmapFontEditor
					selectedGridSize={selectedGridSize}
					selectedCharCode={selectedCharCode}
					currentCharacterBitmap={currentCharacterBitmap ?? ""}
					setCurrentCharacterBitmap={setCurrentCharacterBitmap}
					onDataChange={handleDataChange}
				/>
			</div>
		</div>
	);
}
