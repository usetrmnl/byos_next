"use client";

import { Download, Info, Upload } from "lucide-react";
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { toast } from "sonner";
import bitmapFontFile from "@/components/bitmap-font/bitmap-font.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	convertLegacyPackToV2,
	legacyGlyphDataToBinary,
	normalizeToLegacyPack,
	type BitmapFontPackData,
} from "@/lib/bitmap-font";
import type { LegacyFontMetrics } from "@/lib/bitmap-font/schema/legacy";
import {
	getBuiltInPackOptions,
	fetchBuiltInPack,
} from "@/lib/bitmap-font/packs";
import {
	layoutBitmapText,
	type BitmapFontMetrics,
} from "@/lib/bitmap-font/layout";
import { cn } from "@/lib/utils";
import AddGridSize from "./add-grid-size";
import BitmapFontEditor from "./bitmap-font-editor";
import { binaryToBase64 } from "./bitmap-font-utils";

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

const initialLegacyPack = normalizeToLegacyPack(bitmapFontFile);
const initialBitmapFonts = initialLegacyPack.fonts;

const gridSizeKey = (font: BitmapFont) =>
	font.width > 0 ? `${font.width}x${font.height}` : `0x${font.height}`;

const formatGridSizeLabel = (size: string) => {
	const [width, height] = size.split("x");
	if (width === "0" || width === "dynamic") return `dyn×${height}`;
	return size.replace("x", "×");
};

const ensureLegacyMetricsForSave = (
	packMetrics: BitmapFontMetrics,
	firstFont?: { height: number },
): LegacyFontMetrics => {
	const height = firstFont?.height ?? packMetrics.cellHeight ?? 8;

	return {
		cellHeight: packMetrics.cellHeight ?? height,
		capTop: packMetrics.capTop ?? 0,
		baselineRow: packMetrics.baselineRow ?? height - 1,
		descenderDepth: packMetrics.descenderDepth ?? 0,
		xHeight: packMetrics.xHeight ?? Math.max(1, Math.floor(height * 0.6)),
		lineHeight: packMetrics.lineHeight ?? height,
		pixelUnitX: packMetrics.pixelUnitX ?? packMetrics.pixelUnit ?? 1,
		pixelUnitY: packMetrics.pixelUnitY ?? packMetrics.pixelUnit ?? 1,
		dynamicWidth: packMetrics.dynamicWidth ?? false,
	};
};

export type GlyphMeta = { width?: number; advance?: number };

export interface BitmapFontCharacter {
	charCode: number;
	char: string;
	data: string;
	width?: number;
	advance?: number;
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
		glyphWidth,
		onCharacterClick,
		selectedGridSize,
		isSelected = false,
	}: {
		charCode: number;
		charData: string;
		glyphWidth?: number;
		onCharacterClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
		selectedGridSize: string;
		isSelected?: boolean;
	}) => {
		const [width, height] = selectedGridSize.split("x").map(Number);
		const bitmapWidth = glyphWidth && glyphWidth > 0 ? glyphWidth : width || 8;

		// Render SVG content inline instead of using a separate component
		const renderSvgContent = () => {
			if (!charData && charCode !== 32) {
				return (
					<div className="size-5 border border-border border-dashed flex items-center justify-center">
						{String.fromCharCode(charCode)}
					</div>
				);
			}

			try {
				const binaryArray = charData
					.padEnd(bitmapWidth * height, "0")
					.slice(0, bitmapWidth * height);

				const pathData = Array.from({ length: bitmapWidth * height })
					.map((_, i) => {
						if (i >= binaryArray.length) return "";
						const isBlack = binaryArray[i] === "1";
						if (!isBlack) return "";
						const x = i % bitmapWidth;
						const y = Math.floor(i / bitmapWidth);
						return `M ${x} ${y} h 1 v 1 h -1 z`;
					})
					.join(" ");

				return (
					<svg
						className="w-full h-full dark:invert border-[0.5px] border-border"
						width={bitmapWidth}
						height={height}
						viewBox={`0 0 ${bitmapWidth} ${height}`}
						role="img"
						aria-label={`Character ${String.fromCharCode(charCode)} bitmap`}
					>
						<path d={pathData} fill="black" />
					</svg>
				);
			} catch (error) {
				console.error("Error processing binary:", error);
				return (
					<div className="size-5 border border-border border-dashed flex items-center justify-center text-xs">
						?
					</div>
				);
			}
		};

		return (
			<button
				type="button"
				className={cn(
					"flex flex-col items-center justify-between border p-1 hover:bg-muted cursor-pointer",
					isSelected && "bg-primary/10 border-primary",
				)}
				style={{
					width: `${ITEM_WIDTH}px`,
					height: `${ITEM_HEIGHT}px`,
					padding: "4px",
				}}
				onClick={onCharacterClick}
				data-char-code={charCode}
				aria-label={`Character ${String.fromCharCode(charCode)}`}
			>
				<span className="text-sm mb-1 font-mono">
					{String.fromCharCode(charCode)}
				</span>
				<div className="flex-1 flex items-center justify-center">
					{renderSvgContent()}
				</div>
			</button>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.selectedGridSize === nextProps.selectedGridSize &&
			prevProps.isSelected === nextProps.isSelected &&
			prevProps.charCode === nextProps.charCode &&
			prevProps.charData === nextProps.charData &&
			prevProps.glyphWidth === nextProps.glyphWidth
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
	glyphMeta,
}: {
	selectedGridSize: string;
	onCharacterSelect: (charCode: string) => void;
	selectedCharCode: number;
	characterBitmaps: Map<number, string>;
	currentCharacterBitmap: string | null;
	glyphMeta: Map<number, GlyphMeta>;
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
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const charCode = e.currentTarget.dataset.charCode;
			if (!charCode) return;
			onCharacterSelect(charCode);
		},
		[onCharacterSelect],
	);

	return (
		<div
			ref={containerRef}
			className="w-full overflow-auto border border-border rounded-md p-2 h-[32vh]"
		>
			<div className="flex flex-wrap gap-1 p-1">
				{allCharacters.map((char: Character) =>
					char.charCode === selectedCharCode ? (
						<CharacterItem
							key={char.charCode}
							charCode={char.charCode}
							onCharacterClick={handleCharacterClick}
							charData={currentCharacterBitmap ?? ""}
							glyphWidth={glyphMeta.get(char.charCode)?.width}
							selectedGridSize={selectedGridSize}
							isSelected={true}
						/>
					) : (
						<CharacterItem
							key={char.charCode}
							charCode={char.charCode}
							onCharacterClick={handleCharacterClick}
							charData={characterBitmaps.get(char.charCode) ?? ""}
							glyphWidth={glyphMeta.get(char.charCode)?.width}
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
		packMetrics,
		glyphMeta,
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
		packMetrics: BitmapFontMetrics;
		glyphMeta: Map<number, GlyphMeta>;
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

		const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

		const effectiveCharMap = useMemo(() => {
			const map = new Map(charMap);
			if (currentCharacterBitmap && selectedCharCode) {
				map.set(selectedCharCode, currentCharacterBitmap);
			}
			return map;
		}, [charMap, currentCharacterBitmap, selectedCharCode]);

		const layout = useMemo(() => {
			const font = { width, height, characters: [] as BitmapFontCharacter[] };
			return layoutBitmapText({
				text: previewText,
				font,
				charMap: effectiveCharMap,
				glyphMeta,
				metrics: packMetrics,
				scale: previewScale,
				gap: previewGap,
			});
		}, [
			previewText,
			effectiveCharMap,
			glyphMeta,
			packMetrics,
			width,
			height,
			previewScale,
			previewGap,
		]);

		return (
			<div className="w-full overflow-hidden rounded-2xl border bg-card">
				<div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
					<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Preview
					</h3>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="inline-flex items-center text-muted-foreground hover:text-foreground"
								>
									<Info className="h-3.5 w-3.5" />
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

				<div className="space-y-3 p-4">
					<textarea
						value={inputValue}
						onChange={handleInputChange}
						placeholder="Type preview text (use Enter for overlapping lines)…"
						className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						aria-label="Preview sentence"
					/>

					<div className="flex flex-wrap items-center justify-end gap-4 text-sm">
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
								className="w-24 accent-primary"
							/>
							<span className="text-xs">{previewScale.toFixed(2)}x</span>
						</div>
						<div className="flex items-center gap-2">
							<label
								htmlFor="preview-gap"
								className="text-xs whitespace-nowrap"
							>
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
								className="w-24 accent-primary"
							/>
							<span className="text-xs">{previewGap}px</span>
						</div>
					</div>

					<div className="overflow-x-auto rounded-md border bg-muted/20 p-3">
						<svg
							width={layout.width}
							height={layout.height}
							viewBox={`0 0 ${layout.width} ${layout.height}`}
							className="dark:invert"
							role="img"
							aria-label="Font preview"
						>
							{layout.lines.flatMap((line, lineIndex) =>
								line.paths.map((item, index) => (
									<g
										key={`${lineIndex}-${index}`}
										transform={`translate(${item.x}, ${item.y}) scale(${previewScale})`}
									>
										<path d={item.path} fill="black" />
									</g>
								)),
							)}
						</svg>
					</div>
				</div>
				<div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
					<span>
						Grid: {formatGridSizeLabel(selectedGridSize)}
						{packMetrics.lineHeight && packMetrics.cellHeight
							? ` · line ${packMetrics.lineHeight}px / cell ${packMetrics.cellHeight}px`
							: null}
					</span>
					<span className="tabular-nums">
						{previewText.length} characters · {uniqueChars} unique
					</span>
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
			prevProps.packMetrics === nextProps.packMetrics &&
			prevProps.glyphMeta === nextProps.glyphMeta &&
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
		initialBitmapFonts.forEach((font) => {
			const fontSizeKey = gridSizeKey(font);
			const characterBitmapMap = new Map<number, string>();
			font.characters.forEach((char) => {
				characterBitmapMap.set(
					char.charCode,
					legacyGlyphDataToBinary(char.data, char.width ?? font.width, font.height),
				);
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
		initialBitmapFonts.map((font) => gridSizeKey(font)),
	);

	// Currently selected grid size (e.g., "8x8")
	const [selectedGridSize, setSelectedGridSize] = useState<string>("7x8");

	// Currently selected character (default: 'A' which has charCode 65)
	const [selectedCharCode, setSelectedCharCode] = useState<number>(65);

	// Text used for previewing the font
	const [previewText, setPreviewText] = useState(
		"Hello World!\nThe quick brown fox jumps over the lazy dog.",
	);

	// Preview display settings
	const [previewScale, setPreviewScale] = useState(2); // Size multiplier
	const [previewGap, setPreviewGap] = useState(0); // Space between characters

	const [selectedPackId, setSelectedPackId] = useState("ft");
	const [packMetrics, setPackMetrics] = useState<BitmapFontMetrics>(
		() => initialLegacyPack.metadata?.metrics ?? {},
	);
	const glyphMetaRef = useRef<Record<string, Map<number, GlyphMeta>>>({});
	const [glyphMeta, setGlyphMeta] = useState<Map<number, GlyphMeta>>(new Map());

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
				(a, b) => parseInt(a.split("x")[0], 10) - parseInt(b.split("x")[0], 10),
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
			setGlyphMeta(glyphMetaRef.current[size] ?? new Map());

			setCurrentCharacterBitmap(
				newCharacterBitmaps.get(selectedCharCode) ?? null,
			);
		},
		[selectedCharCode],
	);

	const handleCharacterSelect = useCallback(
		(charCode: string) => {
			const newCharCode = parseInt(charCode, 10);
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
		(fontData: BitmapFontPackData) => {
			try {
				const legacyPack = normalizeToLegacyPack(fontData);

				if (!legacyPack.fonts || !Array.isArray(legacyPack.fonts)) {
					throw new Error("Invalid font data format: missing 'fonts' array");
				}

				const newFontDataObj: { [fontSize: string]: Map<number, string> } = {};
				const newGlyphMetaObj: Record<string, Map<number, GlyphMeta>> = {};
				const newGridSizes: string[] = [];

				legacyPack.fonts.forEach((font: BitmapFont) => {
					if (
						typeof font.width !== "number" ||
						typeof font.height !== "number" ||
						!Array.isArray(font.characters)
					) {
						throw new Error("Invalid font data structure");
					}

					const fontSizeKey = gridSizeKey(font);
					newGridSizes.push(fontSizeKey);

					const characterBitmapMap = new Map<number, string>();
					const glyphMap = new Map<number, GlyphMeta>();

					font.characters.forEach((char: BitmapFontCharacter) => {
						if (
							typeof char.charCode !== "number" ||
							typeof char.data !== "string"
						) {
							throw new Error("Invalid character data structure");
						}

						characterBitmapMap.set(
							char.charCode,
							legacyGlyphDataToBinary(char.data, char.width ?? font.width, font.height),
						);
						if (char.width || char.advance) {
							glyphMap.set(char.charCode, {
								width: char.width,
								advance: char.advance,
							});
						}
					});

					newFontDataObj[fontSizeKey] = characterBitmapMap;
					newGlyphMetaObj[fontSizeKey] = glyphMap;
				});

				Object.keys(fontDataRef.current).forEach((key) => {
					delete fontDataRef.current[key];
				});

				Object.keys(newFontDataObj).forEach((key) => {
					fontDataRef.current[key] = newFontDataObj[key];
				});

				glyphMetaRef.current = newGlyphMetaObj;
				setPackMetrics(legacyPack.metadata?.metrics ?? {});
				setAvailableGridSizes(newGridSizes);

				if (newGridSizes.length > 0) {
					const firstSize = newGridSizes[0];
					setSelectedGridSize(firstSize);

					const newCharacterBitmaps =
						fontDataRef.current[firstSize] ?? new Map();
					setCharacterBitmaps(newCharacterBitmaps);
					setGlyphMeta(newGlyphMetaObj[firstSize] ?? new Map());

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

	const handleBuiltInPackChange = useCallback(
		(packId: string) => {
			setSelectedPackId(packId);
			void (async () => {
				const pack = await fetchBuiltInPack(packId);
				if (!pack) {
					toast.error("Built-in font pack not found");
					return;
				}
				loadFontData(pack);
			})();
		},
		[loadFontData],
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
						.filter(([, binaryString]) => binaryString?.includes("1"))
						.map(([charCode, binaryString]) => {
							const meta = glyphMetaRef.current[size]?.get(charCode);
							return {
								charCode,
								char: String.fromCharCode(charCode),
								data: binaryToBase64(binaryString),
								...(meta?.width
									? {
											width: meta.width,
											advance: meta.advance ?? meta.width,
										}
									: {}),
							};
						})
						.sort((a, b) => a.charCode - b.charCode), // Sort by charCode in ascending order
				};
			})
			.filter((font) => font.characters.length > 0); // Only include fonts with characters

		const firstSavedFont = fontDataToSave[0];
		const saveMetrics = ensureLegacyMetricsForSave(packMetrics, firstSavedFont);

		const legacyPack = {
			metadata: {
				name: "Bitmap Font",
				creator: "Bitmap Font Designer",
				createdAt: new Date().toISOString(),
				version: "2.0",
				description: "Custom bitmap font created with Bitmap Font Designer",
				metrics: saveMetrics,
			},
			fonts: fontDataToSave,
		};

		const exportData = convertLegacyPackToV2(legacyPack);

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
		packMetrics,
	]);

	return (
		<div className="w-full flex flex-col gap-4">
			<div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex min-w-[200px] flex-col gap-1.5">
					<label
						htmlFor="reference-font"
						className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
					>
						Reference font
					</label>
					<Select
						value={selectedPackId}
						onValueChange={handleBuiltInPackChange}
					>
						<SelectTrigger id="reference-font" className="w-full sm:w-[240px]">
							<SelectValue placeholder="Select font" />
						</SelectTrigger>
						<SelectContent>
							{getBuiltInPackOptions().map((pack) => (
								<SelectItem key={pack.id} value={pack.id}>
									{pack.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<p className="max-w-xl text-xs text-muted-foreground">
					Reference packs are converted at build time with pixel snapping for
					crisp bitmap data. Switch grid sizes to edit each preset.
				</p>
			</div>

			<div className="flex flex-wrap gap-2 mb-4 justify-between">
				<div className="flex flex-wrap gap-2">
					{availableGridSizes.map((size) => (
						<Button
							key={size}
							variant="outline"
							className={cn(
								selectedGridSize === size && "bg-primary hover:bg-primary/90",
							)}
							onClick={handleSizeChange}
							data-size={size}
							size="sm"
						>
							{formatGridSizeLabel(size)}
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
				glyphMeta={glyphMeta}
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
					packMetrics={packMetrics}
					glyphMeta={glyphMeta}
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
