"use client";

import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Check,
	ClipboardCopy,
	FlipHorizontal,
	FlipVertical,
	ClipboardPasteIcon as Paste,
	Redo,
	RotateCcw,
	RotateCw,
	Trash,
	Undo,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { BitmapFontMetrics } from "@/lib/bitmap-font/layout";
import type { GlyphMeta } from "./bitmap-font-designer-client";
import {
	binaryToGrid,
	computeInkBoundsFromGrid,
	getEffectiveGlyphWidth,
	gridToBinary,
	type InkBounds,
	parseEditorGridSize,
	resolveEditorFontMetrics,
} from "./bitmap-font-utils";

interface BitmapFontEditorProps {
	selectedGridSize: string;
	selectedCharCode: number;
	currentCharacterBitmap?: string;
	setCurrentCharacterBitmap?: (bitmap: string) => void;
	onDataChange?: (newData: string, charCode: number) => void;
	glyphMeta?: Map<number, GlyphMeta>;
	packMetrics?: BitmapFontMetrics;
	onPackMetricsChange?: (metrics: Partial<BitmapFontMetrics>) => void;
	onGlyphMetaChange?: (charCode: number, meta: Partial<GlyphMeta>) => void;
}

// Line interpolation for fast dragging (Bresenham's line algorithm)
const interpolatePoints = (
	x0: number,
	y0: number,
	x1: number,
	y1: number,
): [number, number][] => {
	const points: [number, number][] = [];
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx - dy;

	while (true) {
		points.push([x0, y0]);
		if (x0 === x1 && y0 === y1) break;
		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			x0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			y0 += sy;
		}
	}

	return points;
};

export default function BitmapFontEditor({
	selectedGridSize,
	selectedCharCode,
	currentCharacterBitmap = "",
	setCurrentCharacterBitmap,
	onDataChange,
	glyphMeta,
	packMetrics = {},
	onPackMetricsChange,
	onGlyphMetaChange,
}: BitmapFontEditorProps) {
	const [, gridHeight] = parseEditorGridSize(selectedGridSize);
	const width = getEffectiveGlyphWidth(
		selectedGridSize,
		selectedCharCode,
		glyphMeta,
	);
	const editorHeight =
		currentCharacterBitmap.length > 0 &&
		currentCharacterBitmap.length % width === 0
			? currentCharacterBitmap.length / width
			: (packMetrics.cellHeight ?? gridHeight);
	const cellSize = 40; // Fixed cell size for better visibility
	const previewRef = useRef<HTMLCanvasElement>(null);
	const previewInnerSize = 84;
	const previewDisplayScale = Math.min(
		previewInnerSize / width,
		previewInnerSize / editorHeight,
		8,
	);

	const fontMetrics = useMemo(
		() => resolveEditorFontMetrics(editorHeight, packMetrics),
		[editorHeight, packMetrics],
	);
	const selectedGlyphMeta = glyphMeta?.get(selectedCharCode);
	const [inkBounds, setInkBounds] = useState<InkBounds | null>(null);
	const inkBoundsKeyRef = useRef("");

	// Canvas and context refs
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gridRef = useRef<number[][]>([]);

	// Interaction state refs (not React state to avoid re-renders)
	const isDraggingRef = useRef(false);
	const drawModeRef = useRef<number | null>(null);
	const prevPositionRef = useRef<[number, number] | null>(null);
	const lastInteractionTimeRef = useRef<number>(0);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const gridChangedRef = useRef(false);
	const currentCharRef = useRef<number>(selectedCharCode);

	// Persistent history storage keyed by character code and grid size
	const historyMapRef = useRef<
		Map<string, { history: number[][][]; index: number }>
	>(new Map());

	// Current working history reference
	const historyRef = useRef<number[][][]>([]);
	const historyIndexRef = useRef<number>(-1);

	// Add states to track undo/redo availability
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	// Clipboard
	const clipboardRef = useRef<number[][] | null>(null);

	// Add state for copy success indicator
	const [showCopySuccess, setShowCopySuccess] = useState(false);

	// History key
	const getHistoryKey = useCallback(() => {
		return `${selectedCharCode}-${selectedGridSize}`;
	}, [selectedCharCode, selectedGridSize]);

	// Load history for current character
	const loadHistoryForCurrentChar = useCallback(() => {
		const key = getHistoryKey();
		const savedHistory = historyMapRef.current.get(key);

		if (savedHistory) {
			historyRef.current = savedHistory.history;
			historyIndexRef.current = savedHistory.index;
		} else {
			// If no history exists for this character, create one with current state
			const initialGridCopy = JSON.parse(JSON.stringify(gridRef.current));
			historyRef.current = [initialGridCopy];
			historyIndexRef.current = 0;
		}

		// Update UI states based on loaded history
		setCanUndo(historyIndexRef.current > 0);
		setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
	}, [getHistoryKey]);

	// Save current history to the map
	const saveHistoryForCurrentChar = useCallback(() => {
		const key = getHistoryKey();
		historyMapRef.current.set(key, {
			history: [...historyRef.current], // Make a copy of the history array
			index: historyIndexRef.current,
		});
	}, [getHistoryKey]);

	// Update the preview canvas
	const updatePreview = useCallback(() => {
		const canvas = previewRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Get actual grid dimensions
		const grid = gridRef.current;
		const actualHeight = grid.length;
		const actualWidth = actualHeight > 0 ? grid[0].length : 0;

		// Safety check for empty grid
		if (actualHeight === 0 || actualWidth === 0) return;

		// Set pixel size (1 pixel per grid cell)
		const pixelSize = 1;

		// Calculate dimensions
		const canvasWidth = actualWidth * pixelSize;
		const canvasHeight = actualHeight * pixelSize;

		// Resize canvas to match bitmap dimensions exactly
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		// Draw cells - only filled cells (1s)
		ctx.fillStyle = "#000000";
		for (let y = 0; y < actualHeight; y++) {
			for (let x = 0; x < actualWidth; x++) {
				if (gridRef.current[y]?.[x]) {
					ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
				}
			}
		}
	}, []);

	// Draw the grid on the canvas
	const drawGrid = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Get actual grid dimensions which may have changed after rotation
		const grid = gridRef.current;
		const actualHeight = grid.length;
		const actualWidth = actualHeight > 0 ? grid[0].length : 0;

		// Safety check for empty grid
		if (actualHeight === 0 || actualWidth === 0) return;

		const borderWidth = 1;
		const cellSizeWithBorder = cellSize + borderWidth;

		// Resize canvas to fit the actual grid size
		canvas.width = actualWidth * cellSizeWithBorder;
		canvas.height = actualHeight * cellSizeWithBorder;

		// Draw background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const typographicTop = Math.max(fontMetrics.maxYRow, fontMetrics.capTop);
		const typographicBottom = Math.min(
			actualHeight - 1,
			Math.max(fontMetrics.descenderRow, fontMetrics.minYRow),
		);
		if (typographicBottom >= typographicTop) {
			ctx.fillStyle = "rgba(59, 130, 246, 0.06)";
			ctx.fillRect(
				0,
				typographicTop * cellSizeWithBorder,
				canvas.width,
				(typographicBottom - typographicTop + 1) * cellSizeWithBorder,
			);
		}

		// Draw grid lines
		ctx.strokeStyle = "#e2e8f0"; // border color
		ctx.lineWidth = borderWidth;

		// Draw cells
		for (let y = 0; y < actualHeight; y++) {
			for (let x = 0; x < actualWidth; x++) {
				const cellX = x * cellSizeWithBorder;
				const cellY = y * cellSizeWithBorder;

				// Draw cell background with safe access to grid
				const cellValue = grid[y]?.[x] ?? 0;
				ctx.fillStyle = cellValue ? "#000000" : "#ffffff";
				ctx.fillRect(cellX, cellY, cellSize, cellSize);

				// Draw cell border
				ctx.strokeRect(cellX, cellY, cellSize, cellSize);
			}
		}

		// Draw metric guides aligned to font JSON rows
		const drawGuideLine = (row: number, color: string, lineWidth = 2) => {
			if (row < 0 || row >= actualHeight) return;
			ctx.strokeStyle = color;
			ctx.lineWidth = lineWidth;
			const guideY = row * cellSizeWithBorder;
			ctx.beginPath();
			ctx.moveTo(0, guideY);
			ctx.lineTo(canvas.width, guideY);
			ctx.stroke();
		};

		drawGuideLine(fontMetrics.maxYRow, "rgba(148, 163, 184, 0.55)", 1);
		drawGuideLine(fontMetrics.minYRow, "rgba(148, 163, 184, 0.55)", 1);
		drawGuideLine(0, "rgba(148, 163, 184, 0.25)", 1);
		drawGuideLine(actualHeight - 1, "rgba(148, 163, 184, 0.25)", 1);
		drawGuideLine(fontMetrics.capTop, "rgba(168, 85, 247, 0.85)");
		drawGuideLine(fontMetrics.xHeightRow, "rgba(0, 128, 255, 0.8)");
		drawGuideLine(fontMetrics.baselineRow, "rgba(255, 128, 0, 0.8)");
		if (fontMetrics.descenderDepth > 0) {
			drawGuideLine(fontMetrics.descenderRow, "rgba(239, 68, 68, 0.8)");
		}

		const bounds = computeInkBoundsFromGrid(grid, fontMetrics.baselineRow);
		const boundsKey = bounds ? JSON.stringify(bounds) : "";
		if (boundsKey !== inkBoundsKeyRef.current) {
			inkBoundsKeyRef.current = boundsKey;
			setInkBounds(bounds);
		}

		// Update the preview
		updatePreview();
	}, [fontMetrics, updatePreview]);

	// Reset grid when selectedCharacter changes
	useEffect(() => {
		if (currentCharRef.current !== selectedCharCode) {
			// Save history for previous character
			saveHistoryForCurrentChar();

			// Always reset grid to match the active bitmap dimensions when character changes.
			gridRef.current = Array(editorHeight)
				.fill(0)
				.map(() => Array(width).fill(0));

			// Convert binary data to grid if available
			if (currentCharacterBitmap) {
				gridRef.current = binaryToGrid(
					currentCharacterBitmap,
					width,
					editorHeight,
				);
			}

			// Update current character ref
			currentCharRef.current = selectedCharCode;

			// Load history for the new character
			loadHistoryForCurrentChar();

			// Redraw the grid
			drawGrid();
		}
	}, [
		selectedCharCode,
		currentCharacterBitmap,
		width,
		editorHeight,
		drawGrid,
		saveHistoryForCurrentChar,
		loadHistoryForCurrentChar,
	]);

	// Initialize grid when size changes or component mounts
	useEffect(() => {
		// Always reset grid to the active bitmap dimensions when size changes.
		gridRef.current = Array(editorHeight)
			.fill(0)
			.map(() => Array(width).fill(0));

		// Convert binary data to grid if available
		if (currentCharacterBitmap) {
			gridRef.current = binaryToGrid(
				currentCharacterBitmap,
				width,
				editorHeight,
			);
		}

		// Load or initialize history for current character
		loadHistoryForCurrentChar();

		// Redraw the grid
		drawGrid();
	}, [
		width,
		editorHeight,
		currentCharacterBitmap,
		drawGrid,
		loadHistoryForCurrentChar,
	]);

	// Initialize canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		const previewCanvas = previewRef.current;
		if (!canvas || !previewCanvas) return;

		// Initial size will be set in drawGrid which handles actual dimensions
		previewCanvas.width = 100;
		previewCanvas.height = 100;

		// Initial draw (will set the correct canvas size based on actual grid)
		drawGrid();
	}, [drawGrid]);

	// Add to history
	const addToHistory = useCallback(() => {
		// Create a deep copy of the current grid
		const gridCopy = JSON.parse(JSON.stringify(gridRef.current));

		// Check if the current state is different from the last history entry
		const lastEntry = historyRef.current[historyIndexRef.current];
		if (lastEntry && JSON.stringify(lastEntry) === JSON.stringify(gridCopy)) {
			return; // Skip if no changes made
		}

		// Remove any future history if we're not at the end
		if (historyIndexRef.current < historyRef.current.length - 1) {
			historyRef.current = historyRef.current.slice(
				0,
				historyIndexRef.current + 1,
			);
		}

		// Add current state to history
		historyRef.current.push(gridCopy);
		historyIndexRef.current = historyRef.current.length - 1;

		// Limit history size to prevent memory issues
		if (historyRef.current.length > 50) {
			historyRef.current = historyRef.current.slice(
				historyRef.current.length - 50,
			);
			historyIndexRef.current = historyRef.current.length - 1;
		}

		// Update UI state
		setCanUndo(historyIndexRef.current > 0);
		setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

		// Save updated history to the map
		saveHistoryForCurrentChar();
	}, [saveHistoryForCurrentChar]);

	// Update the character data in the parent component (debounced)
	const updateCharData = useCallback(() => {
		if (!gridChangedRef.current) return;

		// Clear any existing debounce timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		// Set a new debounce timer
		debounceTimerRef.current = setTimeout(() => {
			// Only update if the grid has changed
			if (gridChangedRef.current) {
				const binaryData = gridToBinary(gridRef.current);

				// Update local preview
				setCurrentCharacterBitmap?.(binaryData);

				// Notify parent component
				onDataChange?.(binaryData, selectedCharCode);
				gridChangedRef.current = false;

				// Make sure history is saved after parent updates
				saveHistoryForCurrentChar();
			}
		}, 300); // 300ms debounce
	}, [
		onDataChange,
		selectedCharCode,
		setCurrentCharacterBitmap,
		saveHistoryForCurrentChar,
	]);

	// Convert canvas coordinates to grid coordinates
	const canvasToGrid = useCallback((x: number, y: number): [number, number] => {
		const borderWidth = 1;
		const cellSizeWithBorder = cellSize + borderWidth;
		const gridX = Math.floor(x / cellSizeWithBorder);
		const gridY = Math.floor(y / cellSizeWithBorder);
		return [gridX, gridY];
	}, []);

	// Handle mouse down
	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const [gridX, gridY] = canvasToGrid(x, y);

			// Ensure coordinates are within bounds
			if (gridX < 0 || gridX >= width || gridY < 0 || gridY >= editorHeight) {
				return;
			}

			// Set drawing state
			isDraggingRef.current = true;
			drawModeRef.current = gridRef.current[gridY][gridX] ? 0 : 1;
			prevPositionRef.current = [gridX, gridY];
			lastInteractionTimeRef.current = Date.now();

			// Update grid
			gridRef.current[gridY][gridX] = drawModeRef.current;
			gridChangedRef.current = true;

			// Redraw
			drawGrid();
		},
		[width, editorHeight, canvasToGrid, drawGrid],
	);

	// Handle mouse move
	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isDraggingRef.current || drawModeRef.current === null) return;

			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const [gridX, gridY] = canvasToGrid(x, y);

			// Ensure coordinates are within bounds
			if (gridX < 0 || gridX >= width || gridY < 0 || gridY >= editorHeight) {
				return;
			}

			// Update last interaction time
			lastInteractionTimeRef.current = Date.now();

			// If we have a previous position, interpolate between them
			if (prevPositionRef.current) {
				const [prevX, prevY] = prevPositionRef.current;
				const points = interpolatePoints(prevX, prevY, gridX, gridY);

				// Fill all points along the line
				for (const [px, py] of points) {
					if (px >= 0 && px < width && py >= 0 && py < editorHeight) {
						gridRef.current[py][px] = drawModeRef.current;
					}
				}
			} else {
				// Just fill the current point if no previous position
				gridRef.current[gridY][gridX] = drawModeRef.current;
			}

			// Update previous position
			prevPositionRef.current = [gridX, gridY];
			gridChangedRef.current = true;

			// Redraw
			drawGrid();
		},
		[width, editorHeight, canvasToGrid, drawGrid],
	);

	// Handle mouse up
	const handleMouseUp = useCallback(() => {
		if (!isDraggingRef.current) return;

		isDraggingRef.current = false;
		drawModeRef.current = null;
		prevPositionRef.current = null;

		// Add to history
		addToHistory();

		// Update character data (debounced)
		updateCharData();
	}, [addToHistory, updateCharData]);

	// Handle mouse leave
	const handleMouseLeave = useCallback(() => {
		handleMouseUp();
	}, [handleMouseUp]);

	// Tool operations
	const flipHorizontal = useCallback(() => {
		gridRef.current = gridRef.current.map((row) => [...row].reverse());
		gridChangedRef.current = true;
		drawGrid();
		addToHistory();
		updateCharData();
	}, [drawGrid, addToHistory, updateCharData]);

	const flipVertical = useCallback(() => {
		gridRef.current = [...gridRef.current].reverse().map((row) => [...row]);
		gridChangedRef.current = true;
		drawGrid();
		addToHistory();
		updateCharData();
	}, [drawGrid, addToHistory, updateCharData]);

	// Helper function to reset grid to component dimensions
	const resetToComponentDimensions = useCallback(() => {
		// Create a new grid matching component dimensions
		const newGrid: number[][] = Array(editorHeight)
			.fill(0)
			.map(() => Array(width).fill(0));

		// Copy over data from old grid where possible
		const oldGrid = gridRef.current;
		const oldHeight = oldGrid.length;
		const oldWidth = oldHeight > 0 ? oldGrid[0].length : 0;

		// Copy as much data as will fit in the new dimensions
		for (let y = 0; y < Math.min(editorHeight, oldHeight); y++) {
			for (let x = 0; x < Math.min(width, oldWidth); x++) {
				newGrid[y][x] = oldGrid[y][x];
			}
		}

		return newGrid;
	}, [width, editorHeight]);

	const rotateClockwise = useCallback(() => {
		// Get current dimensions from grid reference
		const currentHeight = gridRef.current.length;
		const currentWidth = currentHeight > 0 ? gridRef.current[0].length : 0;

		// Create a new grid with swapped dimensions
		const newGrid: number[][] = Array(currentWidth)
			.fill(0)
			.map(() => Array(currentHeight).fill(0));

		for (let y = 0; y < currentHeight; y++) {
			for (let x = 0; x < currentWidth; x++) {
				newGrid[x][currentHeight - 1 - y] = gridRef.current[y][x];
			}
		}

		// Check if resulting dimensions would be compatible with the component
		if (currentWidth === editorHeight && currentHeight === width) {
			gridRef.current = newGrid;
		} else {
			// Rotations would result in incompatible dimensions - reset to component dimensions
			// and copy over what will fit
			const resetGrid = resetToComponentDimensions();

			// Copy rotated data where it will fit
			const newHeight = newGrid.length;
			const newWidth = newHeight > 0 ? newGrid[0].length : 0;

			for (let y = 0; y < Math.min(editorHeight, newHeight); y++) {
				for (let x = 0; x < Math.min(width, newWidth); x++) {
					resetGrid[y][x] = newGrid[y][x];
				}
			}

			gridRef.current = resetGrid;
		}

		gridChangedRef.current = true;
		drawGrid();
		addToHistory();
		updateCharData();
	}, [
		drawGrid,
		addToHistory,
		updateCharData,
		resetToComponentDimensions,
		width,
		editorHeight,
	]);

	const rotateCounterClockwise = useCallback(() => {
		// Get current dimensions from grid reference
		const currentHeight = gridRef.current.length;
		const currentWidth = currentHeight > 0 ? gridRef.current[0].length : 0;

		// Create a new grid with swapped dimensions
		const newGrid: number[][] = Array(currentWidth)
			.fill(0)
			.map(() => Array(currentHeight).fill(0));

		for (let y = 0; y < currentHeight; y++) {
			for (let x = 0; x < currentWidth; x++) {
				newGrid[currentWidth - 1 - x][y] = gridRef.current[y][x];
			}
		}

		// Check if resulting dimensions would be compatible with the component
		if (currentWidth === editorHeight && currentHeight === width) {
			gridRef.current = newGrid;
		} else {
			// Rotations would result in incompatible dimensions - reset to component dimensions
			// and copy over what will fit
			const resetGrid = resetToComponentDimensions();

			// Copy rotated data where it will fit
			const newHeight = newGrid.length;
			const newWidth = newHeight > 0 ? newGrid[0].length : 0;

			for (let y = 0; y < Math.min(editorHeight, newHeight); y++) {
				for (let x = 0; x < Math.min(width, newWidth); x++) {
					resetGrid[y][x] = newGrid[y][x];
				}
			}

			gridRef.current = resetGrid;
		}

		gridChangedRef.current = true;
		drawGrid();
		addToHistory();
		updateCharData();
	}, [
		drawGrid,
		addToHistory,
		updateCharData,
		resetToComponentDimensions,
		width,
		editorHeight,
	]);

	const shift = useCallback(
		(direction: "up" | "down" | "left" | "right") => {
			const newGrid: number[][] = Array(editorHeight)
				.fill(0)
				.map(() => Array(width).fill(0));

			for (let y = 0; y < editorHeight; y++) {
				for (let x = 0; x < width; x++) {
					let newX = x;
					let newY = y;

					if (direction === "up") {
						newY = (y + editorHeight - 1) % editorHeight;
					} else if (direction === "down") {
						newY = (y + 1) % editorHeight;
					} else if (direction === "left") {
						newX = (x + width - 1) % width;
					} else if (direction === "right") {
						newX = (x + 1) % width;
					}

					newGrid[newY][newX] = gridRef.current[y][x];
				}
			}

			gridRef.current = newGrid;
			gridChangedRef.current = true;
			drawGrid();
			addToHistory();
			updateCharData();
		},
		[width, editorHeight, drawGrid, addToHistory, updateCharData],
	);

	const clear = useCallback(() => {
		gridRef.current = Array(editorHeight)
			.fill(0)
			.map(() => Array(width).fill(0));

		gridChangedRef.current = true;
		drawGrid();
		addToHistory();
		updateCharData();
	}, [width, editorHeight, drawGrid, addToHistory, updateCharData]);

	const undo = useCallback(() => {
		if (historyIndexRef.current > 0) {
			historyIndexRef.current--;

			// Get grid state from history
			const prevState = historyRef.current[historyIndexRef.current];

			// Apply the state
			gridRef.current = JSON.parse(JSON.stringify(prevState));

			// Mark grid as changed
			gridChangedRef.current = true;

			// Redraw and update
			drawGrid();
			updateCharData();

			// Update undo/redo states
			setCanUndo(historyIndexRef.current > 0);
			setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

			// Save updated history state
			saveHistoryForCurrentChar();
		}
	}, [drawGrid, updateCharData, saveHistoryForCurrentChar]);

	const redo = useCallback(() => {
		if (historyIndexRef.current < historyRef.current.length - 1) {
			historyIndexRef.current++;

			// Get grid state from history
			const nextState = historyRef.current[historyIndexRef.current];

			// Apply the state
			gridRef.current = JSON.parse(JSON.stringify(nextState));

			// Mark grid as changed
			gridChangedRef.current = true;

			// Redraw and update
			drawGrid();
			updateCharData();

			// Update undo/redo states
			setCanUndo(historyIndexRef.current > 0);
			setCanRedo(historyIndexRef.current < historyRef.current.length - 1);

			// Save updated history state
			saveHistoryForCurrentChar();
		}
	}, [drawGrid, updateCharData, saveHistoryForCurrentChar]);

	const copy = useCallback(() => {
		// Simply copy the current grid to clipboard
		clipboardRef.current = gridRef.current.map((row) => [...row]);
		// Show success indicator
		setShowCopySuccess(true);
		// Hide after 1.5 seconds
		setTimeout(() => setShowCopySuccess(false), 1500);
		// No need to update history or undo/redo state for copy
	}, []);

	const paste = useCallback(() => {
		if (clipboardRef.current) {
			// Directly apply the copied grid
			gridRef.current = clipboardRef.current.map((row) => [...row]);
			gridChangedRef.current = true;
			drawGrid();
			addToHistory();
			updateCharData();
		}
	}, [drawGrid, addToHistory, updateCharData]);

	// Ensure final state is saved when component unmounts
	useEffect(() => {
		const cleanup = () => {
			// Save the history for current character
			saveHistoryForCurrentChar();

			if (gridChangedRef.current) {
				const binaryData = gridToBinary(gridRef.current);

				// Only notify parent component of the change, don't update local state
				onDataChange?.(binaryData, selectedCharCode);
			}

			// Clear any debounce timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};

		return cleanup;
	}, [onDataChange, selectedCharCode, saveHistoryForCurrentChar]);

	// Add an effect to initialize history on component mount
	useEffect(() => {
		// Load history for current character on component mount
		loadHistoryForCurrentChar();
	}, [loadHistoryForCurrentChar]);

	// Global mouse up handler
	useEffect(() => {
		const handleGlobalMouseUp = () => {
			if (isDraggingRef.current) {
				handleMouseUp();
			}
		};

		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, [handleMouseUp]);

	// Handle font metric changes (apply to entire face)
	const handleCapTopChange = useCallback(
		(value: number[]) => {
			const capTop = Math.min(Math.max(0, value[0]), editorHeight - 1);
			onPackMetricsChange?.({ capTop });
			drawGrid();
		},
		[editorHeight, onPackMetricsChange, drawGrid],
	);

	const handleXHeightRowChange = useCallback(
		(value: number[]) => {
			const row = Math.min(Math.max(0, value[0]), editorHeight - 1);
			const xHeight = Math.max(1, fontMetrics.baselineRow - row);
			onPackMetricsChange?.({ xHeight });
			drawGrid();
		},
		[editorHeight, fontMetrics.baselineRow, onPackMetricsChange, drawGrid],
	);

	const handleBaselineChange = useCallback(
		(value: number[]) => {
			const baselineRow = Math.min(Math.max(0, value[0]), editorHeight - 1);
			onPackMetricsChange?.({ baselineRow });
			drawGrid();
		},
		[editorHeight, onPackMetricsChange, drawGrid],
	);

	const handleDescenderDepthChange = useCallback(
		(value: number[]) => {
			const descenderDepth = Math.min(Math.max(0, value[0]), editorHeight - 1);
			onPackMetricsChange?.({ descenderDepth });
			drawGrid();
		},
		[editorHeight, onPackMetricsChange, drawGrid],
	);

	const handleGlyphWidthChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const width = Number.parseInt(e.target.value, 10);
			if (!Number.isFinite(width) || width < 1) return;
			onGlyphMetaChange?.(selectedCharCode, { width });
		},
		[selectedCharCode, onGlyphMetaChange],
	);

	const handleGlyphAdvanceChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const advance = Number.parseInt(e.target.value, 10);
			if (!Number.isFinite(advance) || advance < 1) return;
			onGlyphMetaChange?.(selectedCharCode, { advance });
		},
		[selectedCharCode, onGlyphMetaChange],
	);

	// Redraw guides when font metrics change
	useEffect(() => {
		drawGrid();
	}, [drawGrid]);

	// After component mounts, capture initial state
	useEffect(() => {
		// Make sure we have an initial state in history
		if (historyRef.current.length === 0) {
			const initialGridCopy = JSON.parse(JSON.stringify(gridRef.current));
			historyRef.current = [initialGridCopy];
			historyIndexRef.current = 0;
			setCanUndo(false);
			setCanRedo(false);
		}
	}, []);

	return (
		<div className="overflow-hidden rounded-2xl border bg-card">
			<div className="border-b bg-muted/30 px-4 py-2">
				<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					Editor
				</h3>
			</div>

			<div className="flex flex-col gap-4 p-4">
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={undo}
						disabled={!canUndo}
						variant="outline"
						size="icon"
						title="Undo"
						aria-label="Undo"
						className="active:bg-accent active:scale-95"
					>
						<Undo className="w-4 h-4" />
					</Button>
					<Button
						onClick={redo}
						disabled={!canRedo}
						variant="outline"
						size="icon"
						title="Redo"
						aria-label="Redo"
						className="active:bg-accent active:scale-95"
					>
						<Redo className="w-4 h-4" />
					</Button>
					<Button
						onClick={clear}
						variant="outline"
						size="icon"
						title="Clear"
						aria-label="Clear"
						className="active:bg-accent active:scale-95"
					>
						<Trash className="w-4 h-4" />
					</Button>
					<Button
						onClick={flipHorizontal}
						variant="outline"
						size="icon"
						title="Flip Horizontal"
						aria-label="Flip Horizontal"
						className="active:bg-accent active:scale-95"
					>
						<FlipHorizontal className="w-4 h-4" />
					</Button>
					<Button
						onClick={flipVertical}
						variant="outline"
						size="icon"
						title="Flip Vertical"
						aria-label="Flip Vertical"
						className="active:bg-accent active:scale-95"
					>
						<FlipVertical className="w-4 h-4" />
					</Button>
					<Button
						onClick={rotateClockwise}
						variant="outline"
						size="icon"
						title="Rotate Clockwise"
						aria-label="Rotate Clockwise"
						className="active:bg-accent active:scale-95"
					>
						<RotateCw className="w-4 h-4" />
					</Button>
					<Button
						onClick={rotateCounterClockwise}
						variant="outline"
						size="icon"
						title="Rotate Counter-clockwise"
						aria-label="Rotate Counter-clockwise"
						className="active:bg-accent active:scale-95"
					>
						<RotateCcw className="w-4 h-4" />
					</Button>

					{/* Group the shifting buttons together with no gap */}
					<div className="flex">
						<Button
							onClick={() => shift("up")}
							variant="outline"
							size="icon"
							title="Shift Up"
							aria-label="Shift Up"
							className="active:bg-accent active:scale-95 rounded-r-none border-r-0"
						>
							<ArrowUp className="w-4 h-4" />
						</Button>
						<Button
							onClick={() => shift("down")}
							variant="outline"
							size="icon"
							title="Shift Down"
							aria-label="Shift Down"
							className="active:bg-accent active:scale-95 rounded-none border-r-0"
						>
							<ArrowDown className="w-4 h-4" />
						</Button>
						<Button
							onClick={() => shift("left")}
							variant="outline"
							size="icon"
							title="Shift Left"
							aria-label="Shift Left"
							className="active:bg-accent active:scale-95 rounded-none border-r-0"
						>
							<ArrowLeft className="w-4 h-4" />
						</Button>
						<Button
							onClick={() => shift("right")}
							variant="outline"
							size="icon"
							title="Shift Right"
							aria-label="Shift Right"
							className="active:bg-accent active:scale-95 rounded-l-none"
						>
							<ArrowRight className="w-4 h-4" />
						</Button>
					</div>

					<Button
						onClick={copy}
						variant="outline"
						size="icon"
						title="Copy"
						aria-label="Copy"
						className="active:bg-accent active:scale-95 relative"
					>
						{showCopySuccess ? (
							<Check className="w-4 h-4 text-primary" />
						) : (
							<ClipboardCopy className="w-4 h-4" />
						)}
					</Button>
					<Button
						onClick={paste}
						disabled={!clipboardRef.current}
						variant="outline"
						size="icon"
						title="Paste"
						aria-label="Paste"
						className="active:bg-accent active:scale-95"
					>
						<Paste className="w-4 h-4" />
					</Button>
				</div>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
					<div className="max-w-full overflow-auto rounded-md border bg-background">
						<canvas
							ref={canvasRef}
							className="cursor-crosshair dark:invert border-[0.5px] border-neutral-300"
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseLeave}
						/>
					</div>
					<div className="flex w-full shrink-0 flex-col items-stretch lg:w-[240px]">
						<div className="mb-2 flex size-[100px] items-center justify-center self-center overflow-hidden rounded-md border bg-card p-2">
							<canvas
								ref={previewRef}
								className="dark:invert border-[0.25px] border-neutral-300"
								style={{
									imageRendering: "pixelated",
									width: `${Math.max(1, width * previewDisplayScale)}px`,
									height: `${Math.max(1, editorHeight * previewDisplayScale)}px`,
								}}
							/>
						</div>
						<div className="mb-3 rounded-md border bg-card p-2 text-center text-lg font-mono">
							{String.fromCharCode(selectedCharCode)} {selectedCharCode}
						</div>

						<div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
							<div className="space-y-3">
								<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
									Font metrics
								</p>

								<div className="grid grid-cols-2 gap-x-2 gap-y-1 rounded-md border bg-muted/20 p-2 text-[11px] text-muted-foreground">
									<span>maxY</span>
									<span className="text-right font-mono text-foreground">
										{fontMetrics.maxY}
									</span>
									<span>minY</span>
									<span className="text-right font-mono text-foreground">
										{fontMetrics.minY}
									</span>
									<span>lineGap</span>
									<span className="text-right font-mono text-foreground">
										{fontMetrics.lineHeight}
									</span>
									<span>cell</span>
									<span className="text-right font-mono text-foreground">
										{fontMetrics.cellHeight}
									</span>
								</div>

								<div className="flex flex-col gap-2">
									<Label
										htmlFor="cap-top"
										className="flex items-center justify-between"
									>
										<span>Cap height</span>
										<span className="text-xs text-muted-foreground">
											row {fontMetrics.capTop} · y {fontMetrics.capHeightY}
										</span>
									</Label>
									<Slider
										id="cap-top"
										min={0}
										max={editorHeight - 1}
										step={1}
										value={[fontMetrics.capTop]}
										onValueChange={handleCapTopChange}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label
										htmlFor="x-height"
										className="flex items-center justify-between"
									>
										<span>X-Height</span>
										<span className="text-xs text-muted-foreground">
											row {fontMetrics.xHeightRow} · y {fontMetrics.xHeightY}
										</span>
									</Label>
									<Slider
										id="x-height"
										min={0}
										max={editorHeight - 1}
										step={1}
										value={[fontMetrics.xHeightRow]}
										onValueChange={handleXHeightRowChange}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label
										htmlFor="baseline"
										className="flex items-center justify-between"
									>
										<span>Baseline</span>
										<span className="text-xs text-muted-foreground">
											row {fontMetrics.baselineRow} · y 0
										</span>
									</Label>
									<Slider
										id="baseline"
										min={0}
										max={editorHeight - 1}
										step={1}
										value={[fontMetrics.baselineRow]}
										onValueChange={handleBaselineChange}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label
										htmlFor="descender"
										className="flex items-center justify-between"
									>
										<span>Descender</span>
										<span className="text-xs text-muted-foreground">
											{fontMetrics.descenderDepth}px · y{" "}
											{fontMetrics.descenderY}
										</span>
									</Label>
									<Slider
										id="descender"
										min={0}
										max={editorHeight - 1}
										step={1}
										value={[fontMetrics.descenderDepth]}
										onValueChange={handleDescenderDepthChange}
									/>
								</div>
							</div>

							<div className="space-y-3 border-t pt-3">
								<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
									Glyph metrics
								</p>

								<div className="grid grid-cols-[auto_1fr] items-center gap-2">
									<Label htmlFor="glyph-width" className="text-xs">
										Width
									</Label>
									<Input
										id="glyph-width"
										type="number"
										min={1}
										value={selectedGlyphMeta?.width ?? width}
										onChange={handleGlyphWidthChange}
										className="h-8 font-mono text-xs"
									/>
									<Label htmlFor="glyph-advance" className="text-xs">
										Advance
									</Label>
									<Input
										id="glyph-advance"
										type="number"
										min={1}
										value={
											selectedGlyphMeta?.advance ??
											selectedGlyphMeta?.width ??
											width
										}
										onChange={handleGlyphAdvanceChange}
										className="h-8 font-mono text-xs"
									/>
								</div>

								<div className="grid grid-cols-2 gap-x-2 gap-y-1 rounded-md border bg-muted/20 p-2 text-[11px] text-muted-foreground">
									<span>bounds.minX</span>
									<span className="text-right font-mono text-foreground">
										{inkBounds?.minX ?? "—"}
									</span>
									<span>bounds.maxX</span>
									<span className="text-right font-mono text-foreground">
										{inkBounds?.maxX ?? "—"}
									</span>
									<span>bounds.minY</span>
									<span className="text-right font-mono text-foreground">
										{inkBounds?.minY ?? "—"}
									</span>
									<span>bounds.maxY</span>
									<span className="text-right font-mono text-foreground">
										{inkBounds?.maxY ?? "—"}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
