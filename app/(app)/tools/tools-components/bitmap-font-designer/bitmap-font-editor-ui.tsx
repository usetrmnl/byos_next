"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GlyphMeta } from "./bitmap-font-designer-client";
import {
	binaryToGrid,
	getEffectiveGlyphWidth,
	type EditorFontMetrics,
} from "./bitmap-font-utils";

export type DrawMiniGlyphOptions = {
	cellSize: number;
	opacity?: number;
	showGrid?: boolean;
	showGuides?: boolean;
	metrics: EditorFontMetrics;
};

export const drawMiniGlyphOnCanvas = (
	ctx: CanvasRenderingContext2D,
	grid: number[][],
	originX: number,
	originY: number,
	{
		cellSize,
		opacity = 1,
		showGrid = true,
		showGuides = true,
		metrics,
	}: DrawMiniGlyphOptions,
): { width: number; height: number } => {
	const height = grid.length;
	const width = height > 0 ? (grid[0]?.length ?? 0) : 0;
	if (width === 0 || height === 0) return { width: 0, height: 0 };

	const border = 1;
	const cellWithBorder = cellSize + border;
	const canvasW = width * cellWithBorder;
	const canvasH = height * cellWithBorder;

	ctx.save();
	ctx.globalAlpha = opacity;

	const typographicTop = Math.max(metrics.maxYRow, metrics.capTop);
	const typographicBottom = Math.min(
		height - 1,
		Math.max(metrics.descenderRow, metrics.minYRow),
	);
	if (typographicBottom >= typographicTop) {
		ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
		ctx.fillRect(
			originX,
			originY + typographicTop * cellWithBorder,
			canvasW,
			(typographicBottom - typographicTop + 1) * cellWithBorder,
		);
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const cellX = originX + x * cellWithBorder;
			const cellY = originY + y * cellWithBorder;
			ctx.fillStyle = grid[y]?.[x] ? "#000000" : "#ffffff";
			ctx.fillRect(cellX, cellY, cellSize, cellSize);
			if (showGrid) {
				ctx.strokeStyle = "#e2e8f0";
				ctx.lineWidth = border;
				ctx.strokeRect(cellX, cellY, cellSize, cellSize);
			}
		}
	}

	if (showGuides) {
		const drawGuide = (row: number, color: string, lineWidth = 1) => {
			if (row < 0 || row >= height) return;
			ctx.strokeStyle = color;
			ctx.lineWidth = lineWidth;
			const y = originY + row * cellWithBorder;
			ctx.beginPath();
			ctx.moveTo(originX, y);
			ctx.lineTo(originX + canvasW, y);
			ctx.stroke();
		};

		drawGuide(metrics.maxYRow, "rgba(148, 163, 184, 0.55)");
		drawGuide(metrics.minYRow, "rgba(148, 163, 184, 0.55)");
		drawGuide(metrics.capTop, "rgba(168, 85, 247, 0.75)", 1.5);
		drawGuide(metrics.xHeightRow, "rgba(0, 128, 255, 0.7)", 1.5);
		drawGuide(metrics.baselineRow, "rgba(255, 128, 0, 0.75)", 1.5);
		if (metrics.descenderDepth > 0) {
			drawGuide(metrics.descenderRow, "rgba(239, 68, 68, 0.7)", 1.5);
		}
	}

	ctx.restore();
	return { width: canvasW, height: canvasH };
};

const binaryToSvgPath = (binary: string, bitmapWidth: number, bitmapHeight: number) =>
	Array.from({ length: bitmapWidth * bitmapHeight })
		.map((_, i) => {
			if (binary[i] !== "1") return "";
			const x = i % bitmapWidth;
			const y = Math.floor(i / bitmapWidth);
			return `M ${x} ${y} h 1 v 1 h -1 z`;
		})
		.filter(Boolean)
		.join(" ");

type EditorGlyphStripProps = {
	characterCharCodes: number[];
	selectedCharCode: number;
	selectedGridSize: string;
	characterBitmaps: Map<number, string>;
	currentCharacterBitmap: string;
	glyphMeta?: Map<number, GlyphMeta>;
	cellHeight: number;
	onCharacterSelect?: (charCode: number) => void;
};

export const EditorGlyphStrip = ({
	characterCharCodes,
	selectedCharCode,
	selectedGridSize,
	characterBitmaps,
	currentCharacterBitmap,
	glyphMeta,
	cellHeight,
	onCharacterSelect,
}: EditorGlyphStripProps) => {
	const stripRef = useRef<HTMLDivElement>(null);
	const selectedRef = useRef<HTMLButtonElement>(null);

	const scrollStrip = useCallback((delta: number) => {
		stripRef.current?.scrollBy({ left: delta, behavior: "smooth" });
	}, []);

	useEffect(() => {
		selectedRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
			inline: "center",
		});
	}, [selectedCharCode]);

	return (
		<div className="flex items-stretch gap-1 border-b pb-3">
			<div
				ref={stripRef}
				className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain scroll-smooth pb-1"
			>
				{characterCharCodes.map((charCode) => {
					const char = String.fromCharCode(charCode);
					const isSelected = charCode === selectedCharCode;
					const bitmap = isSelected
						? currentCharacterBitmap
						: (characterBitmaps.get(charCode) ?? "");
					const stride = getEffectiveGlyphWidth(
						selectedGridSize,
						charCode,
						glyphMeta,
					);
					const bitmapHeight =
						bitmap.length > 0 && bitmap.length % stride === 0
							? bitmap.length / stride
							: cellHeight;
					const hasInk = bitmap.includes("1");
					const pathData = hasInk
						? binaryToSvgPath(
								bitmap.padEnd(stride * bitmapHeight, "0").slice(0, stride * bitmapHeight),
								stride,
								bitmapHeight,
							)
						: "";

					return (
						<button
							key={charCode}
							ref={isSelected ? selectedRef : undefined}
							type="button"
							onClick={() => onCharacterSelect?.(charCode)}
							className={cn(
								"flex w-11 shrink-0 flex-col items-center gap-0.5 rounded-md border bg-background p-1 transition-colors hover:bg-muted/60",
								isSelected
									? "border-primary ring-2 ring-primary/30"
									: "border-border/70",
							)}
							title={`${char} (${charCode})`}
							aria-label={`Edit glyph ${char}`}
							aria-current={isSelected ? "true" : undefined}
						>
							<svg
								className="size-7 dark:invert"
								viewBox={`0 0 ${stride} ${bitmapHeight}`}
								role="img"
								aria-hidden="true"
							>
								{pathData ? <path d={pathData} fill="black" /> : null}
							</svg>
							<span className="font-mono text-[9px] leading-none text-muted-foreground">
								{char}
							</span>
						</button>
					);
				})}
			</div>
			<div className="flex shrink-0 flex-col justify-center gap-1 border-l pl-1">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-7"
					onClick={() => scrollStrip(-160)}
					aria-label="Scroll glyphs left"
				>
					<ChevronLeft className="size-4" />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-7"
					onClick={() => scrollStrip(160)}
					aria-label="Scroll glyphs right"
				>
					<ChevronRight className="size-4" />
				</Button>
			</div>
		</div>
	);
};

type EditorGlyphComparisonProps = {
	selectedCharCode: number;
	characterCharCodes: number[];
	characterBitmaps: Map<number, string>;
	currentCharacterBitmap: string;
	selectedGridSize: string;
	glyphMeta?: Map<number, GlyphMeta>;
	fontMetrics: EditorFontMetrics;
	editorHeight: number;
};

/** Pixel height for each glyph slot in the sidebar comparison row. */
const COMPARISON_SLOT_HEIGHT = 96;

export const EditorGlyphComparison = ({
	selectedCharCode,
	characterCharCodes,
	characterBitmaps,
	currentCharacterBitmap,
	selectedGridSize,
	glyphMeta,
	fontMetrics,
	editorHeight,
}: EditorGlyphComparisonProps) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const neighborCodes = useMemo(() => {
		const index = characterCharCodes.indexOf(selectedCharCode);
		if (index < 0) return { prev: undefined, next: undefined };
		return {
			prev: index > 0 ? characterCharCodes[index - 1] : undefined,
			next:
				index < characterCharCodes.length - 1
					? characterCharCodes[index + 1]
					: undefined,
		};
	}, [characterCharCodes, selectedCharCode]);

	const decodeGlyphGrid = useCallback(
		(charCode: number, binary: string) => {
			const stride = getEffectiveGlyphWidth(
				selectedGridSize,
				charCode,
				glyphMeta,
			);
			return {
				grid: binaryToGrid(
					binary.padEnd(stride * editorHeight, "0"),
					stride,
					editorHeight,
				),
				stride,
				height: editorHeight,
			};
		},
		[selectedGridSize, glyphMeta, editorHeight],
	);

	const comparisonLayout = useMemo(() => {
		const border = 1;
		const cellSize = Math.max(
			2,
			Math.floor(COMPARISON_SLOT_HEIGHT / editorHeight) - border,
		);
		const slotHeight = editorHeight * (cellSize + border);
		return { cellSize, slotHeight, border };
	}, [editorHeight]);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const { cellSize, slotHeight } = comparisonLayout;

		const slots: Array<{
			charCode: number;
			binary: string;
			opacity: number;
		}> = [];

		if (neighborCodes.prev != null) {
			slots.push({
				charCode: neighborCodes.prev,
				binary: characterBitmaps.get(neighborCodes.prev) ?? "",
				opacity: 0.45,
			});
		}

		slots.push({
			charCode: selectedCharCode,
			binary: currentCharacterBitmap,
			opacity: 1,
		});

		if (neighborCodes.next != null) {
			slots.push({
				charCode: neighborCodes.next,
				binary: characterBitmaps.get(neighborCodes.next) ?? "",
				opacity: 0.45,
			});
		}

		const slotGap = 8;
		const padding = 4;
		const layouts = slots.map((slot) => {
			const { grid, stride } = decodeGlyphGrid(slot.charCode, slot.binary);
			const w = stride * (cellSize + comparisonLayout.border);
			return { ...slot, grid, w };
		});

		const totalWidth =
			layouts.reduce((sum, layout) => sum + layout.w, 0) +
			Math.max(0, layouts.length - 1) * slotGap +
			padding * 2;

		canvas.width = Math.max(totalWidth, 1);
		canvas.height = slotHeight + padding * 2;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		let x = padding;
		const y = padding;
		for (const layout of layouts) {
			drawMiniGlyphOnCanvas(ctx, layout.grid, x, y, {
				cellSize,
				opacity: layout.opacity,
				showGrid: true,
				showGuides: true,
				metrics: fontMetrics,
			});
			x += layout.w + slotGap;
		}
	}, [
		neighborCodes,
		selectedCharCode,
		currentCharacterBitmap,
		characterBitmaps,
		fontMetrics,
		decodeGlyphGrid,
		comparisonLayout,
	]);

	return (
		<div className="overflow-hidden rounded-lg border bg-background p-2">
			<div
				className="flex min-h-[104px] items-center justify-center"
				style={{ height: comparisonLayout.slotHeight + 8 }}
			>
				<canvas
					ref={canvasRef}
					className="mx-auto block max-w-full dark:invert"
					style={{
						imageRendering: "pixelated",
						height: comparisonLayout.slotHeight + 8,
						width: "auto",
					}}
				/>
			</div>
			<p className="mt-2 text-center font-mono text-sm">
				{String.fromCharCode(selectedCharCode)}{" "}
				<span className="text-muted-foreground">{selectedCharCode}</span>
			</p>
		</div>
	);
};
