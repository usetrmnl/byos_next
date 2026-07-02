"use client";

import { Download, Info, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
	type BitmapFontPackData,
	convertLegacyMetrics,
	convertLegacyPackToV2,
	convertV2MetricsToLegacy,
	normalizeToLegacyPack,
} from "@/lib/bitmap-font";
import {
	type BitmapFontMetrics,
	layoutBitmapText,
} from "@/lib/bitmap-font/layout";
import {
	getV2DefaultCharGap,
	getV2LayoutHeight,
	getV2MetricGuides,
	layoutV2Text,
} from "@/lib/bitmap-font/layout-v2";
import {
	isV2BitmapFont,
	listV2FaceKeys,
	resolveV2Face,
} from "@/lib/bitmap-font/pack-utils";
import {
	fetchBuiltInPack,
	getBuiltInPackOptions,
} from "@/lib/bitmap-font/packs";
import type { LegacyFontMetrics } from "@/lib/bitmap-font/schema/legacy";
import type {
	Glyph,
	NewBitmapFont,
	NewBitmapFontMetrics,
} from "@/lib/bitmap-font/schema/v2";
import { cn } from "@/lib/utils";
import AddGridSize from "./add-grid-size";
import BitmapFontEditor from "./bitmap-font-editor";
import {
	buildBitmapCacheFromGlyphs,
	buildPreviewGlyphsFromEditorStore,
	computeGlyphBoundsFromRows,
	type EditorGlyph,
	editorGlyphToPackBinary,
	getGlyphBitmapStride,
	glyphRowsToSvgPath,
	packBinaryToEditorGlyph,
	packMetricsFromV2Metrics,
	packMetricsToLegacySave,
	packMetricsToV2PreviewMetrics,
	resizeGlyphRows,
	shiftEditorGlyphRowsY,
	syncPackMetricsFromV2,
} from "./bitmap-font-utils";

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

const _gridSizeKey = (font: BitmapFont) =>
	font.width > 0 ? `${font.width}x${font.height}` : `0x${font.height}`;

const formatGridSizeLabel = (size: string) => {
	const [width, height] = size.split("x");
	if (width === "0" || width === "dynamic") return `dyn×${height}`;
	return size.replace("x", "×");
};

const DEFAULT_DESIGNER_PACK_ID = "ft";

const DESIGNER_URL_KEYS = {
	pack: "pack",
	size: "size",
	char: "char",
} as const;

const normalizeDesignerSizeParam = (value: string) =>
	value.replaceAll("×", "x").replaceAll("%C3%97", "x");

const parseDesignerPackParam = (value: string | null | undefined): string => {
	if (!value) return DEFAULT_DESIGNER_PACK_ID;
	const validIds = new Set(getBuiltInPackOptions().map((pack) => pack.id));
	return validIds.has(value) ? value : DEFAULT_DESIGNER_PACK_ID;
};

const parseDesignerCharParam = (
	value: string | null | undefined,
): number | null => {
	if (!value) return null;
	const asNumber = Number.parseInt(value, 10);
	if (!Number.isNaN(asNumber) && asNumber > 0) return asNumber;
	if (value.length === 1) return value.codePointAt(0) ?? null;
	return null;
};

const parseDesignerSizeParam = (
	value: string | null | undefined,
	availableSizes: string[],
): string | null => {
	if (!value) return null;
	const normalized = normalizeDesignerSizeParam(value);
	return availableSizes.includes(normalized) ? normalized : null;
};

type LoadFontDataOptions = {
	gridSize?: string;
	charCode?: number;
	silent?: boolean;
};

const ensureLegacyMetricsForSave = (
	packMetrics: BitmapFontMetrics,
	firstFont?: { height: number },
): LegacyFontMetrics => {
	const synced = packMetricsToLegacySave(packMetrics, firstFont?.height);

	return {
		cellHeight: synced.cellHeight ?? firstFont?.height ?? 8,
		capTop: synced.capTop ?? 0,
		baselineRow: synced.baselineRow ?? (firstFont?.height ?? 8) - 1,
		descenderDepth: synced.descenderDepth ?? 0,
		xHeight: synced.xHeight ?? synced.xHeightY ?? 1,
		lineHeight: synced.lineHeight ?? firstFont?.height ?? 8,
		pixelUnitX: synced.pixelUnitX ?? synced.pixelUnit ?? 1,
		pixelUnitY: synced.pixelUnitY ?? synced.pixelUnit ?? 1,
		dynamicWidth: synced.dynamicWidth ?? false,
	};
};

export type GlyphMeta = { width?: number; advance?: number };

const buildEditorMapsFromV2Pack = (pack: NewBitmapFont) => {
	const glyphDataObj: Record<string, Map<number, EditorGlyph>> = {};
	const glyphMetaObj: Record<string, Map<number, GlyphMeta>> = {};

	for (const faceKey of listV2FaceKeys(pack)) {
		const face = resolveV2Face(pack, faceKey);
		if (!face) continue;

		const glyphStore = new Map<number, EditorGlyph>();
		const glyphMap = new Map<number, GlyphMeta>();

		for (const glyph of Object.values(face.glyphs)) {
			glyphStore.set(glyph.charCode, {
				rows: glyph.rows,
				width: glyph.width,
				advance: glyph.advance,
			});
			glyphMap.set(glyph.charCode, {
				width: glyph.width,
				advance: glyph.advance,
			});
		}

		glyphDataObj[faceKey] = glyphStore;
		glyphMetaObj[faceKey] = glyphMap;
	}

	return { glyphDataObj, glyphMetaObj };
};

const editorMapsToBitmapCache = (
	glyphDataObj: Record<string, Map<number, EditorGlyph>>,
	pack: NewBitmapFont,
): Record<string, Map<number, string>> => {
	const cache: Record<string, Map<number, string>> = {};
	for (const faceKey of Object.keys(glyphDataObj)) {
		const face = resolveV2Face(pack, faceKey);
		const glyphs = glyphDataObj[faceKey];
		if (!face || !glyphs) continue;
		cache[faceKey] = buildBitmapCacheFromGlyphs(
			glyphs,
			face.metrics,
			face.gridHeight,
		);
	}
	return cache;
};

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
export const editorCharacterCodes = allCharacters.map((char) => char.charCode);

interface Character {
	charCode: number;
}

// Combined CharacterItem component with BinaryToSvg functionality
const CharacterItem = memo(
	({
		charCode,
		charData,
		glyphRows,
		rowStride,
		layoutHeight,
		metrics,
		gridHeight,
		onCharacterClick,
		selectedGridSize,
		isSelected = false,
	}: {
		charCode: number;
		charData: string;
		glyphRows?: EditorGlyph["rows"];
		rowStride?: number;
		layoutHeight?: number;
		metrics?: NewBitmapFontMetrics;
		gridHeight?: number;
		onCharacterClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
		selectedGridSize: string;
		isSelected?: boolean;
	}) => {
		const [width, height] = selectedGridSize.split("x").map(Number);
		const bitmapWidth = rowStride && rowStride > 0 ? rowStride : width || 8;
		const bitmapHeight =
			layoutHeight ??
			(charData.length > 0 && charData.length % bitmapWidth === 0
				? charData.length / bitmapWidth
				: height);

		const renderSvgContent = () => {
			if (!charData && !glyphRows?.length && charCode !== 32) {
				return (
					<div
						className="size-5 border border-dashed border-border"
						aria-hidden="true"
					/>
				);
			}

			try {
				const pathData =
					glyphRows && metrics && gridHeight != null
						? glyphRowsToSvgPath(glyphRows, metrics, gridHeight)
						: Array.from({
								length: bitmapWidth * bitmapHeight,
							})
								.map((_, i) => {
									const binaryArray = charData
										.padEnd(bitmapWidth * bitmapHeight, "0")
										.slice(0, bitmapWidth * bitmapHeight);
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
						height={bitmapHeight}
						viewBox={`0 0 ${bitmapWidth} ${bitmapHeight}`}
						role="img"
						aria-label={`Character ${String.fromCharCode(charCode)} bitmap`}
					>
						<path d={pathData} fill="black" />
					</svg>
				);
			} catch (error) {
				console.error("Error processing glyph:", error);
				return (
					<div className="flex size-5 items-center justify-center border border-dashed border-border text-xs text-muted-foreground">
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
				title={`Character ${String.fromCharCode(charCode)}`}
			>
				<span className="mb-1 max-w-full truncate font-mono text-[10px] leading-none text-muted-foreground">
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
			prevProps.rowStride === nextProps.rowStride &&
			prevProps.glyphRows === nextProps.glyphRows &&
			prevProps.layoutHeight === nextProps.layoutHeight &&
			prevProps.gridHeight === nextProps.gridHeight
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
	glyphStore,
	v2Face,
}: {
	selectedGridSize: string;
	onCharacterSelect: (charCode: string) => void;
	selectedCharCode: number;
	characterBitmaps: Map<number, string>;
	currentCharacterBitmap: string | null;
	glyphMeta: Map<number, GlyphMeta>;
	glyphStore: Map<number, EditorGlyph>;
	v2Face: ReturnType<typeof resolveV2Face> | null;
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
				{allCharacters.map((char: Character) => {
					const storedGlyph = glyphStore.get(char.charCode);
					const rowStride = getGlyphBitmapStride(
						selectedGridSize,
						char.charCode,
						glyphMeta,
					);
					const layoutHeight = v2Face
						? getV2LayoutHeight(v2Face.metrics, v2Face.gridHeight)
						: undefined;

					return char.charCode === selectedCharCode ? (
						<CharacterItem
							key={char.charCode}
							charCode={char.charCode}
							onCharacterClick={handleCharacterClick}
							charData={currentCharacterBitmap ?? ""}
							glyphRows={storedGlyph?.rows}
							rowStride={rowStride}
							layoutHeight={layoutHeight}
							metrics={v2Face?.metrics}
							gridHeight={v2Face?.gridHeight}
							selectedGridSize={selectedGridSize}
							isSelected={true}
						/>
					) : (
						<CharacterItem
							key={char.charCode}
							charCode={char.charCode}
							onCharacterClick={handleCharacterClick}
							charData={characterBitmaps.get(char.charCode) ?? ""}
							glyphRows={storedGlyph?.rows}
							rowStride={rowStride}
							layoutHeight={layoutHeight}
							metrics={v2Face?.metrics}
							gridHeight={v2Face?.gridHeight}
							selectedGridSize={selectedGridSize}
						/>
					);
				})}
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
		v2Pack,
		getEditorGlyphs,
		editorGlyphsRevision: _editorGlyphsRevision,
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
		v2Pack: NewBitmapFont | null;
		getEditorGlyphs: () => Map<number, EditorGlyph> | undefined;
		editorGlyphsRevision: number;
		onPreviewTextChange: (newPreviewText: string) => void;
		onPreviewScaleChange: (newScale: number) => void;
		onPreviewGapChange: (newGap: number) => void;
	}) => {
		const [width, height] = selectedGridSize.split("x").map(Number);
		const v2Face = v2Pack ? resolveV2Face(v2Pack, selectedGridSize) : null;
		const charMap = characterBitmaps;
		const uniqueChars = new Set(Array.from(previewText)).size;

		const previewMetrics = useMemo((): NewBitmapFontMetrics | null => {
			if (!v2Face) return null;
			return packMetricsToV2PreviewMetrics(packMetrics, v2Face.metrics);
		}, [v2Face, packMetrics]);

		const defaultCharGap = previewMetrics
			? getV2DefaultCharGap(previewMetrics)
			: 0;

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
		const previewGlyphs = useMemo(() => {
			if (!v2Face || !previewMetrics) return null;
			return buildPreviewGlyphsFromEditorStore(
				getEditorGlyphs(),
				previewMetrics,
				v2Face.gridHeight,
				selectedGridSize,
				glyphMeta,
				currentCharacterBitmap
					? { charCode: selectedCharCode, binary: currentCharacterBitmap }
					: undefined,
				packMetrics,
			);
		}, [
			v2Face,
			previewMetrics,
			getEditorGlyphs,
			selectedGridSize,
			glyphMeta,
			packMetrics,
			selectedCharCode,
			currentCharacterBitmap,
		]);

		const definedChars = useMemo(() => {
			if (previewGlyphs) {
				return Array.from(previewText).filter(
					(char) => char !== " " && previewGlyphs[char] != null,
				).length;
			}

			if (!charMap) return 0;
			return Array.from(previewText).filter(
				(char) => char !== " " && charMap.has(char.charCodeAt(0)),
			).length;
		}, [previewText, previewGlyphs, charMap]);

		const effectiveCharMap = useMemo(() => {
			const map = new Map(charMap);
			if (currentCharacterBitmap && selectedCharCode) {
				map.set(selectedCharCode, currentCharacterBitmap);
			}
			return map;
		}, [charMap, currentCharacterBitmap, selectedCharCode]);

		const layout = useMemo(() => {
			if (v2Face && previewMetrics && previewGlyphs) {
				return layoutV2Text({
					text: previewText,
					glyphs: previewGlyphs,
					metrics: previewMetrics,
					gridWidth: v2Face.gridWidth,
					gridHeight: v2Face.gridHeight,
					scale: previewScale,
					gap: previewGap,
				});
			}

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
			v2Face,
			previewMetrics,
			previewGlyphs,
			previewText,
			effectiveCharMap,
			glyphMeta,
			packMetrics,
			width,
			height,
			previewScale,
			previewGap,
		]);

		const metricGuides = previewMetrics
			? getV2MetricGuides(previewMetrics, previewScale)
			: [];

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
								Gap (+{defaultCharGap}):
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
							<span className="text-xs">{defaultCharGap + previewGap}px</span>
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
							{metricGuides.length > 0 && layout.lines[0] && (
								<g>
									{metricGuides.map((guide) => (
										<line
											key={guide.label}
											x1={0}
											y1={guide.svgY}
											x2={layout.lines[0]?.width ?? layout.width}
											y2={guide.svgY}
											stroke={
												guide.emphasis === "strong"
													? "rgba(59, 130, 246, 0.45)"
													: "rgba(148, 163, 184, 0.35)"
											}
											strokeWidth={guide.emphasis === "strong" ? 1 : 0.75}
											strokeDasharray={
												guide.emphasis === "light" ? "4 3" : undefined
											}
										/>
									))}
								</g>
							)}
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
			prevProps.v2Pack === nextProps.v2Pack &&
			prevProps.characterBitmaps === nextProps.characterBitmaps &&
			prevProps.selectedCharCode === nextProps.selectedCharCode &&
			prevProps.currentCharacterBitmap === nextProps.currentCharacterBitmap &&
			prevProps.editorGlyphsRevision === nextProps.editorGlyphsRevision
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

const initialV2Pack: NewBitmapFont = isV2BitmapFont(bitmapFontFile)
	? bitmapFontFile
	: convertLegacyPackToV2(initialLegacyPack);
const initialEditorMaps = buildEditorMapsFromV2Pack(initialV2Pack);
const initialBitmapCache = editorMapsToBitmapCache(
	initialEditorMaps.glyphDataObj,
	initialV2Pack,
);

export default function BitmapFontDesignerClient() {
	const router = useRouter();
	const pathname = usePathname() ?? "";
	const searchParams = useSearchParams();
	const skipUrlSyncRef = useRef(true);
	const urlHydratedRef = useRef(false);

	// Process and organize font data into a structured map for efficient access
	const initialGlyphDataObj = initialEditorMaps.glyphDataObj;
	const initialGridKeys = Object.keys(initialGlyphDataObj);
	const defaultGridSize = initialGridKeys[0] ?? "0x8";
	const defaultCharCode = 65;

	// Create a ref to store v2 glyph rows (source of truth — avoids flat-binary wrap)
	const fontDataRef = useRef(initialGlyphDataObj);
	fontDataRef.current = initialGlyphDataObj;

	// Available grid sizes extracted from the font data
	const [availableGridSizes, setAvailableGridSizes] = useState(() =>
		Object.keys(initialGlyphDataObj),
	);

	// Currently selected grid size (e.g., "0x8")
	const [selectedGridSize, setSelectedGridSize] =
		useState<string>(defaultGridSize);

	// Currently selected character (default: 'A' which has charCode 65)
	const [selectedCharCode, setSelectedCharCode] =
		useState<number>(defaultCharCode);

	// Text used for previewing the font
	const [previewText, setPreviewText] = useState(
		"Hello World!\nThe quick brown fox jumps over the lazy dog.",
	);

	// Preview display settings
	const [previewScale, setPreviewScale] = useState(2); // Size multiplier
	const [previewGap, setPreviewGap] = useState(0); // Space between characters

	const [selectedPackId, setSelectedPackId] = useState(
		DEFAULT_DESIGNER_PACK_ID,
	);
	const [v2Pack, setV2Pack] = useState<NewBitmapFont | null>(
		() => initialV2Pack,
	);
	const [packMetrics, setPackMetrics] = useState<BitmapFontMetrics>(() => {
		if (isV2BitmapFont(bitmapFontFile)) {
			const face = resolveV2Face(bitmapFontFile, defaultGridSize);
			if (face) {
				const legacy = convertV2MetricsToLegacy(face.metrics, face.gridHeight);
				return packMetricsFromV2Metrics(face.metrics, legacy);
			}
		}
		return initialLegacyPack.metadata?.metrics ?? {};
	});
	const [editorGlyphsRevision, setEditorGlyphsRevision] = useState(0);
	const glyphMetaRef = useRef<Record<string, Map<number, GlyphMeta>>>(
		initialEditorMaps.glyphMetaObj,
	);
	const [glyphMeta, setGlyphMeta] = useState<Map<number, GlyphMeta>>(
		() => initialEditorMaps.glyphMetaObj[defaultGridSize] ?? new Map(),
	);

	// Derived flat binary cache for the editor canvas (built from v2 rows)
	const [characterBitmaps, setCharacterBitmaps] = useState<Map<number, string>>(
		() => initialBitmapCache[defaultGridSize] ?? new Map(),
	);

	const [currentCharacterBitmap, setCurrentCharacterBitmap] = useState<
		string | null
	>(() => initialBitmapCache[defaultGridSize]?.get(defaultCharCode) ?? null);

	const [, startTransition] = useTransition();

	// Handle adding a new grid size
	const handleAddSize = useCallback(
		(newSize: string) => {
			if (!fontDataRef.current[newSize]) {
				fontDataRef.current[newSize] = new Map<number, EditorGlyph>();
			}

			// Update the availableGridSizes list
			setAvailableGridSizes((prev) => {
				const newSizes = [...prev, newSize].sort(
					(a, b) =>
						parseInt(a.split("x")[0], 10) - parseInt(b.split("x")[0], 10),
				);
				return newSizes;
			});

			// Switch to the new grid size
			setSelectedGridSize(newSize);

			// Update character bitmaps for the new size
			setCharacterBitmaps(
				v2Pack
					? (editorMapsToBitmapCache(fontDataRef.current, v2Pack)[newSize] ??
							new Map())
					: new Map(),
			);

			// Update current character bitmap
			setCurrentCharacterBitmap(null);
		},
		[v2Pack],
	);

	const handleDataChange = useCallback(
		(newBinaryData: string, charCode: number) => {
			const face = v2Pack ? resolveV2Face(v2Pack, selectedGridSize) : null;
			if (!face) return;

			startTransition(() => {
				const sizeMeta = glyphMetaRef.current[selectedGridSize];
				const rowWidth = getGlyphBitmapStride(
					selectedGridSize,
					charCode,
					sizeMeta,
				);
				const layoutHeight = getV2LayoutHeight(face.metrics, face.gridHeight);
				const meta = sizeMeta?.get(charCode);

				const glyph = packBinaryToEditorGlyph(
					newBinaryData,
					rowWidth,
					layoutHeight,
					packMetrics,
					meta?.advance ?? meta?.width ?? rowWidth,
				);

				if (!fontDataRef.current[selectedGridSize]) {
					fontDataRef.current[selectedGridSize] = new Map();
				}
				fontDataRef.current[selectedGridSize].set(charCode, glyph);

				setCharacterBitmaps((prev) => {
					const next = new Map(prev);
					next.set(charCode, newBinaryData);
					return next;
				});

				setEditorGlyphsRevision((revision) => revision + 1);

				if (charCode === selectedCharCode) {
					setCurrentCharacterBitmap(newBinaryData);
				}
			});
		},
		[selectedGridSize, selectedCharCode, v2Pack, packMetrics],
	);

	const applyGridSize = useCallback(
		(size: string, charCode: number) => {
			setSelectedGridSize(size);

			if (!fontDataRef.current[size]) {
				fontDataRef.current[size] = new Map<number, EditorGlyph>();
			}

			const faceForSize = v2Pack ? resolveV2Face(v2Pack, size) : null;
			const newCharacterBitmaps =
				faceForSize && fontDataRef.current[size]
					? buildBitmapCacheFromGlyphs(
							fontDataRef.current[size],
							faceForSize.metrics,
							faceForSize.gridHeight,
						)
					: new Map();
			setCharacterBitmaps(newCharacterBitmaps);
			setGlyphMeta(glyphMetaRef.current[size] ?? new Map());

			if (v2Pack) {
				const face = resolveV2Face(v2Pack, size);
				if (face) {
					const legacy = convertV2MetricsToLegacy(
						face.metrics,
						face.gridHeight,
					);
					setPackMetrics(packMetricsFromV2Metrics(face.metrics, legacy));
				}
			}

			setSelectedCharCode(charCode);
			setCurrentCharacterBitmap(newCharacterBitmaps.get(charCode) ?? null);
		},
		[v2Pack],
	);

	const handleSizeChange = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const size = e.currentTarget.dataset.size;
			if (!size) return;

			applyGridSize(size, selectedCharCode);
		},
		[applyGridSize, selectedCharCode],
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

	const getEditorGlyphs = useCallback(
		() => fontDataRef.current[selectedGridSize],
		[selectedGridSize],
	);

	const handlePackMetricsChange = useCallback(
		(partial: Partial<BitmapFontMetrics>) => {
			setPackMetrics((prev) =>
				syncPackMetricsFromV2(
					prev,
					partial,
					partial.baselineRow ?? prev.baselineRow ?? 0,
				),
			);
		},
		[],
	);

	const handleBaselineReanchor = useCallback(
		(newBaselineRow: number) => {
			const face = v2Pack ? resolveV2Face(v2Pack, selectedGridSize) : null;
			if (!face) return;

			const store = fontDataRef.current[selectedGridSize];
			if (!store) return;

			const layoutHeight = getV2LayoutHeight(face.metrics, face.gridHeight);
			const sizeMeta = glyphMetaRef.current[selectedGridSize];
			const oldBaseline =
				packMetrics.baselineRow ??
				convertV2MetricsToLegacy(face.metrics, face.gridHeight).baselineRow ??
				layoutHeight - 1;
			const deltaRows = newBaselineRow - oldBaseline;
			if (deltaRows === 0) return;

			// Flush live canvas edits for the selected glyph using the current baseline.
			if (currentCharacterBitmap && selectedCharCode) {
				const rowWidth = getGlyphBitmapStride(
					selectedGridSize,
					selectedCharCode,
					sizeMeta,
				);
				const meta = sizeMeta?.get(selectedCharCode);
				store.set(
					selectedCharCode,
					packBinaryToEditorGlyph(
						currentCharacterBitmap,
						rowWidth,
						layoutHeight,
						packMetrics,
						meta?.advance ?? meta?.width ?? rowWidth,
					),
				);
			}

			// Reanchor v2 y coords to the new baseline row; keep editor pixels in place.
			for (const [charCode, glyph] of store) {
				store.set(charCode, shiftEditorGlyphRowsY(glyph, deltaRows));
			}

			setPackMetrics(syncPackMetricsFromV2(packMetrics, {}, newBaselineRow));
			setEditorGlyphsRevision((revision) => revision + 1);
		},
		[
			v2Pack,
			selectedGridSize,
			selectedCharCode,
			currentCharacterBitmap,
			packMetrics,
		],
	);

	const handleGlyphMetaChange = useCallback(
		(charCode: number, meta: Partial<GlyphMeta>) => {
			const sizeMap =
				glyphMetaRef.current[selectedGridSize] ?? new Map<number, GlyphMeta>();
			glyphMetaRef.current[selectedGridSize] = sizeMap;
			const nextMeta = { ...sizeMap.get(charCode), ...meta };
			sizeMap.set(charCode, nextMeta);

			setGlyphMeta((prev) => {
				const next = new Map(prev);
				next.set(charCode, nextMeta);
				return next;
			});

			if (meta.width == null || !v2Pack) return;

			const face = resolveV2Face(v2Pack, selectedGridSize);
			const store = fontDataRef.current[selectedGridSize];
			const existing = store?.get(charCode);
			if (!face || !store || !existing) return;

			const newWidth = meta.width;
			const resized: EditorGlyph = {
				width: newWidth,
				advance: meta.advance ?? Math.max(existing.advance, newWidth),
				rows: resizeGlyphRows(existing.rows, newWidth),
			};
			store.set(charCode, resized);

			const rowWidth = getGlyphBitmapStride(
				selectedGridSize,
				charCode,
				sizeMap,
			);
			const binary = editorGlyphToPackBinary(
				resized,
				packMetrics,
				getV2LayoutHeight(face.metrics, face.gridHeight),
				rowWidth,
			);

			setCharacterBitmaps((prev) => {
				const next = new Map(prev);
				next.set(charCode, binary);
				return next;
			});

			if (charCode === selectedCharCode) {
				setCurrentCharacterBitmap(binary);
			}
		},
		[selectedGridSize, selectedCharCode, v2Pack, packMetrics],
	);

	// Function to load font data from uploaded JSON file
	const loadFontData = useCallback(
		(fontData: BitmapFontPackData, options?: LoadFontDataOptions) => {
			try {
				const legacyPack = normalizeToLegacyPack(fontData);

				if (!legacyPack.fonts || !Array.isArray(legacyPack.fonts)) {
					throw new Error("Invalid font data format: missing 'fonts' array");
				}

				const loadedV2Pack = isV2BitmapFont(fontData)
					? fontData
					: convertLegacyPackToV2(legacyPack);
				const built = buildEditorMapsFromV2Pack(loadedV2Pack);
				const newGlyphDataObj = built.glyphDataObj;
				const newGlyphMetaObj = built.glyphMetaObj;
				const newGridSizes = Object.keys(newGlyphDataObj);
				const newBitmapCache = editorMapsToBitmapCache(
					newGlyphDataObj,
					loadedV2Pack,
				);

				Object.keys(fontDataRef.current).forEach((key) => {
					delete fontDataRef.current[key];
				});

				Object.keys(newGlyphDataObj).forEach((key) => {
					fontDataRef.current[key] = newGlyphDataObj[key];
				});

				glyphMetaRef.current = newGlyphMetaObj;
				setV2Pack(loadedV2Pack);

				const firstSize = newGridSizes[0];
				const targetSize =
					options?.gridSize && newGridSizes.includes(options.gridSize)
						? options.gridSize
						: firstSize;
				const targetChar = options?.charCode ?? selectedCharCode;
				const v2Face = targetSize
					? resolveV2Face(loadedV2Pack, targetSize)
					: null;
				setPackMetrics(
					v2Face
						? packMetricsFromV2Metrics(
								v2Face.metrics,
								convertV2MetricsToLegacy(v2Face.metrics, v2Face.gridHeight),
							)
						: (legacyPack.metadata?.metrics ?? {}),
				);
				setAvailableGridSizes(newGridSizes);

				if (newGridSizes.length > 0 && targetSize) {
					setSelectedGridSize(targetSize);
					setSelectedCharCode(targetChar);

					const newCharacterBitmaps = newBitmapCache[targetSize] ?? new Map();
					setCharacterBitmaps(newCharacterBitmaps);
					setGlyphMeta(newGlyphMetaObj[targetSize] ?? new Map());

					setCurrentCharacterBitmap(
						newCharacterBitmaps.get(targetChar) ?? null,
					);
				}

				if (!options?.silent) {
					toast.success("Font data loaded successfully!");
				}
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

	// Function to save the font data to JSON (v2 row runs — no legacy flat binary)
	const saveFontData = useCallback(() => {
		if (!v2Pack) return;

		// Flush in-progress editor bitmap into v2 row store
		if (currentCharacterBitmap && selectedCharCode) {
			const face = resolveV2Face(v2Pack, selectedGridSize);
			if (face) {
				const sizeMeta = glyphMetaRef.current[selectedGridSize];
				const rowWidth = getGlyphBitmapStride(
					selectedGridSize,
					selectedCharCode,
					sizeMeta,
				);
				const layoutHeight = getV2LayoutHeight(face.metrics, face.gridHeight);
				const meta = sizeMeta?.get(selectedCharCode);
				const glyph = packBinaryToEditorGlyph(
					currentCharacterBitmap,
					rowWidth,
					layoutHeight,
					packMetrics,
					meta?.advance ?? meta?.width ?? rowWidth,
				);
				if (!fontDataRef.current[selectedGridSize]) {
					fontDataRef.current[selectedGridSize] = new Map();
				}
				fontDataRef.current[selectedGridSize].set(selectedCharCode, glyph);
			}
		}

		const [firstSize] = availableGridSizes;
		const firstFace = firstSize ? resolveV2Face(v2Pack, firstSize) : null;
		const sharedMetrics = firstFace
			? {
					...convertLegacyMetrics(
						ensureLegacyMetricsForSave(
							packMetrics,
							firstFace.gridHeight > 0
								? { height: firstFace.gridHeight }
								: undefined,
						),
					),
					defaultCharGap:
						v2Pack.metadata.metrics.defaultCharGap ??
						firstFace.metrics.defaultCharGap ??
						0,
				}
			: v2Pack.metadata.metrics;

		const faces: NonNullable<NewBitmapFont["faces"]> = {};

		for (const size of availableGridSizes) {
			const face = resolveV2Face(v2Pack, size);
			if (!face) continue;

			const glyphStore = fontDataRef.current[size] ?? new Map();
			const faceMetrics =
				size === selectedGridSize
					? {
							...convertLegacyMetrics(
								ensureLegacyMetricsForSave(packMetrics, {
									height: face.gridHeight,
								}),
							),
							defaultCharGap: face.metrics.defaultCharGap ?? 0,
						}
					: face.metrics;

			const glyphs: Record<string, Glyph> = {};

			for (const [charCode, editorGlyph] of glyphStore) {
				if (editorGlyph.rows.length === 0) continue;

				const char = String.fromCharCode(charCode);
				glyphs[char] = {
					charCode,
					char,
					width: editorGlyph.width,
					advance: editorGlyph.advance,
					leftBearing: 0,
					bounds: computeGlyphBoundsFromRows(
						editorGlyph.rows,
						editorGlyph.width,
					),
					rows: editorGlyph.rows,
				};
			}

			if (Object.keys(glyphs).length === 0) continue;

			faces[size] = {
				metrics: faceMetrics,
				glyphs,
			};
		}

		const exportData: NewBitmapFont = {
			metadata: {
				...v2Pack.metadata,
				name: v2Pack.metadata.name ?? "Bitmap Font",
				version: v2Pack.metadata.version ?? "2.0",
				metrics: sharedMetrics,
				createdAt: new Date().toISOString(),
			},
			faces,
		};

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
		currentCharacterBitmap,
		selectedCharCode,
		packMetrics,
		v2Pack,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: hydrate URL state once after mount
	useEffect(() => {
		if (urlHydratedRef.current) return;
		urlHydratedRef.current = true;
		skipUrlSyncRef.current = true;

		const packId = parseDesignerPackParam(
			searchParams?.get(DESIGNER_URL_KEYS.pack),
		);
		const urlChar = parseDesignerCharParam(
			searchParams?.get(DESIGNER_URL_KEYS.char),
		);
		const urlSize = parseDesignerSizeParam(
			searchParams?.get(DESIGNER_URL_KEYS.size),
			initialGridKeys,
		);
		const targetChar = urlChar ?? defaultCharCode;

		const finishHydration = () => {
			skipUrlSyncRef.current = false;
		};

		if (packId !== DEFAULT_DESIGNER_PACK_ID) {
			setSelectedPackId(packId);
			void (async () => {
				const pack = await fetchBuiltInPack(packId);
				if (!pack) {
					toast.error("Built-in font pack not found");
					finishHydration();
					return;
				}

				const packV2 = isV2BitmapFont(pack)
					? pack
					: convertLegacyPackToV2(normalizeToLegacyPack(pack));
				const packGridKeys = Object.keys(
					buildEditorMapsFromV2Pack(packV2).glyphDataObj,
				);
				const packUrlSize = parseDesignerSizeParam(
					searchParams?.get(DESIGNER_URL_KEYS.size),
					packGridKeys,
				);

				loadFontData(pack, {
					gridSize: packUrlSize ?? undefined,
					charCode: targetChar,
					silent: true,
				});
				finishHydration();
			})();
			return;
		}

		const hasSizeOverride = urlSize !== null && urlSize !== defaultGridSize;
		const hasCharOverride = urlChar !== null && urlChar !== defaultCharCode;

		if (hasSizeOverride || hasCharOverride) {
			applyGridSize(urlSize ?? defaultGridSize, targetChar);
		}

		finishHydration();
	}, []);

	useEffect(() => {
		if (skipUrlSyncRef.current) return;

		const params = new URLSearchParams(searchParams?.toString());
		params.set(DESIGNER_URL_KEYS.pack, selectedPackId);
		params.set(DESIGNER_URL_KEYS.size, selectedGridSize);
		params.set(DESIGNER_URL_KEYS.char, String(selectedCharCode));

		const nextQuery = params.toString();
		const currentQuery = searchParams?.toString() ?? "";
		if (nextQuery === currentQuery) return;

		router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
			scroll: false,
		});
	}, [
		pathname,
		router,
		searchParams,
		selectedCharCode,
		selectedGridSize,
		selectedPackId,
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
					Reference packs are traced at build time with grid discovery and
					baseline-relative v2 output. Switch grid sizes to edit each preset.
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
				glyphStore={fontDataRef.current[selectedGridSize] ?? new Map()}
				v2Face={v2Pack ? resolveV2Face(v2Pack, selectedGridSize) : null}
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
					v2Pack={v2Pack}
					getEditorGlyphs={getEditorGlyphs}
					editorGlyphsRevision={editorGlyphsRevision}
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
					glyphMeta={glyphMeta}
					packMetrics={packMetrics}
					onPackMetricsChange={handlePackMetricsChange}
					onBaselineReanchor={handleBaselineReanchor}
					onGlyphMetaChange={handleGlyphMetaChange}
					characterCharCodes={editorCharacterCodes}
					characterBitmaps={characterBitmaps}
					onCharacterSelect={(charCode) =>
						handleCharacterSelect(String(charCode))
					}
				/>
			</div>
		</div>
	);
}
