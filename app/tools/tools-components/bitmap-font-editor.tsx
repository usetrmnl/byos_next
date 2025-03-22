"use client"

import { useCallback, useState, useRef, memo, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Copy,
    Eraser,
    FlipHorizontal,
    FlipVertical,
    Paintbrush,
    ClipboardPasteIcon as Paste,
    RotateCcw,
    RotateCw,
    Undo,
    Redo,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { binaryToGrid, gridToBinary } from "./bitmap-font-utils"

interface BitmapFontEditorProps {
    selectedSize: string
    selectedCharacter: string
    binaryData: string
    onDataChange?: (newData: string) => void
}

// Line interpolation for fast dragging (Bresenham's line algorithm)
const interpolatePoints = (x0: number, y0: number, x1: number, y1: number): [number, number][] => {
    const points: [number, number][] = []
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    while (true) {
        points.push([x0, y0])
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 > -dy) {
            err -= dy
            x0 += sx
        }
        if (e2 < dx) {
            err += dx
            y0 += sy
        }
    }

    return points
}

export default function BitmapFontEditor({
    selectedSize,
    selectedCharacter,
    binaryData,
    onDataChange,
}: BitmapFontEditorProps) {
    const [width, height] = selectedSize.split('x').map(Number)
    const cellSize = 40 // Fixed cell size for better visibility
    const previewRef = useRef<HTMLCanvasElement>(null)

    // Canvas and context refs
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gridRef = useRef<number[][]>([])

    // Interaction state refs (not React state to avoid re-renders)
    const isDraggingRef = useRef(false)
    const drawModeRef = useRef<number | null>(null)
    const prevPositionRef = useRef<[number, number] | null>(null)
    const lastInteractionTimeRef = useRef<number>(0)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const gridChangedRef = useRef(false)
    const currentCharRef = useRef<string>(selectedCharacter)

    // History for undo/redo (local to this editor)
    const historyRef = useRef<number[][][]>([[]])
    const historyIndexRef = useRef<number>(0)

    // Clipboard
    const clipboardRef = useRef<number[][] | null>(null)

    // Force re-render for UI state that needs to be reflected in React
    const [, forceUpdate] = useState({})

    // Draw the grid on the canvas
    const drawGrid = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw grid
        const grid = gridRef.current
        const borderWidth = 1
        const cellSizeWithBorder = cellSize + borderWidth

        // Draw background
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw grid lines
        ctx.strokeStyle = "#e2e8f0" // border color
        ctx.lineWidth = borderWidth

        // Draw cells
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cellX = x * cellSizeWithBorder
                const cellY = y * cellSizeWithBorder

                // Draw cell background
                ctx.fillStyle = grid[y][x] ? "#000000" : "#ffffff"
                ctx.fillRect(cellX, cellY, cellSize, cellSize)

                // Draw cell border
                ctx.strokeRect(cellX, cellY, cellSize, cellSize)
            }
        }

        // Update the preview
        updatePreview()
    }, [width, height, cellSize])

    // Update the preview canvas
    const updatePreview = useCallback(() => {
        const canvas = previewRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Set pixel size (1 pixel per grid cell)
        const pixelSize = 1

        // Calculate dimensions
        const canvasWidth = width * pixelSize
        const canvasHeight = height * pixelSize

        // Resize canvas to match bitmap dimensions exactly
        canvas.width = canvasWidth
        canvas.height = canvasHeight

        // Draw cells - only filled cells (1s)
        ctx.fillStyle = "#000000"
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (gridRef.current[y][x]) {
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
                }
            }
        }
    }, [width, height])

    // Reset grid when selectedCharacter changes
    useEffect(() => {
        if (currentCharRef.current !== selectedCharacter) {
            // Initialize grid with zeros first to ensure clean state
            gridRef.current = Array(height)
                .fill(0)
                .map(() => Array(width).fill(0))

            // Convert binary data to grid if available
            if (binaryData) {
                gridRef.current = binaryToGrid(binaryData, width, height)
            }

            // Update history
            historyRef.current = [JSON.parse(JSON.stringify(gridRef.current))]
            historyIndexRef.current = 0

            // Update current character ref
            currentCharRef.current = selectedCharacter

            // Redraw the grid
            drawGrid()
        }
    }, [selectedCharacter, binaryData, width, height, drawGrid])

    // Initialize grid when size changes or component mounts
    useEffect(() => {
        // Initialize grid with zeros
        gridRef.current = Array(height)
            .fill(0)
            .map(() => Array(width).fill(0))

        // Convert binary data to grid if available
        if (binaryData) {
            gridRef.current = binaryToGrid(binaryData, width, height)
        }

        // Update history
        historyRef.current = [JSON.parse(JSON.stringify(gridRef.current))]
        historyIndexRef.current = 0

        // Redraw the grid
        drawGrid()
    }, [width, height, binaryData, drawGrid])

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current
        const previewCanvas = previewRef.current
        if (!canvas || !previewCanvas) return

        // Set canvas size
        const borderWidth = 1
        const cellSizeWithBorder = cellSize + borderWidth
        canvas.width = width * cellSizeWithBorder
        canvas.height = height * cellSizeWithBorder

        // Set preview canvas size
        previewCanvas.width = 100
        previewCanvas.height = 100

        // Initial draw
        drawGrid()
    }, [width, height, cellSize, drawGrid])

    // Add to history
    const addToHistory = useCallback(() => {
        // Remove any future history if we're not at the end
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)

        // Create a deep copy of the current grid
        const gridCopy = gridRef.current.map((row) => [...row])
        historyRef.current.push(gridCopy)
        historyIndexRef.current = historyRef.current.length - 1

        // Limit history size to prevent memory issues
        if (historyRef.current.length > 50) {
            historyRef.current = historyRef.current.slice(historyRef.current.length - 50)
            historyIndexRef.current = historyRef.current.length - 1
        }
    }, [])

    // Update the character data in the parent component (debounced)
    const updateCharData = useCallback(() => {
        if (!gridChangedRef.current) return

        // Clear any existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        // Set a new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            // Only update if the grid has changed
            if (gridChangedRef.current) {
                const binaryData = gridToBinary(gridRef.current)
                onDataChange?.(binaryData)
                gridChangedRef.current = false
            }
        }, 300) // 300ms debounce
    }, [onDataChange])

    // Convert canvas coordinates to grid coordinates
    const canvasToGrid = useCallback(
        (x: number, y: number): [number, number] => {
            const borderWidth = 1
            const cellSizeWithBorder = cellSize + borderWidth
            const gridX = Math.floor(x / cellSizeWithBorder)
            const gridY = Math.floor(y / cellSizeWithBorder)
            return [gridX, gridY]
        },
        [cellSize],
    )

    // Handle mouse down
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current
            if (!canvas) return

            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const [gridX, gridY] = canvasToGrid(x, y)

            // Ensure coordinates are within bounds
            if (gridX < 0 || gridX >= width || gridY < 0 || gridY >= height) return

            // Set drawing state
            isDraggingRef.current = true
            drawModeRef.current = gridRef.current[gridY][gridX] ? 0 : 1
            prevPositionRef.current = [gridX, gridY]
            lastInteractionTimeRef.current = Date.now()

            // Update grid
            gridRef.current[gridY][gridX] = drawModeRef.current
            gridChangedRef.current = true

            // Redraw
            drawGrid()
        },
        [width, height, canvasToGrid, drawGrid],
    )

    // Handle mouse move
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDraggingRef.current || drawModeRef.current === null) return

            const canvas = canvasRef.current
            if (!canvas) return

            const rect = canvas.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const [gridX, gridY] = canvasToGrid(x, y)

            // Ensure coordinates are within bounds
            if (gridX < 0 || gridX >= width || gridY < 0 || gridY >= height) return

            // Update last interaction time
            lastInteractionTimeRef.current = Date.now()

            // If we have a previous position, interpolate between them
            if (prevPositionRef.current) {
                const [prevX, prevY] = prevPositionRef.current
                const points = interpolatePoints(prevX, prevY, gridX, gridY)

                // Fill all points along the line
                for (const [px, py] of points) {
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        gridRef.current[py][px] = drawModeRef.current
                    }
                }
            } else {
                // Just fill the current point if no previous position
                gridRef.current[gridY][gridX] = drawModeRef.current
            }

            // Update previous position
            prevPositionRef.current = [gridX, gridY]
            gridChangedRef.current = true

            // Redraw
            drawGrid()
        },
        [width, height, canvasToGrid, drawGrid],
    )

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        if (!isDraggingRef.current) return

        isDraggingRef.current = false
        drawModeRef.current = null
        prevPositionRef.current = null

        // Add to history
        addToHistory()

        // Update character data (debounced)
        updateCharData()

        // Force update to reflect UI state changes (like undo/redo buttons)
        forceUpdate({})
    }, [addToHistory, updateCharData])

    // Handle mouse leave
    const handleMouseLeave = useCallback(() => {
        handleMouseUp()
    }, [handleMouseUp])

    // Tool operations
    const flipHorizontal = useCallback(() => {
        gridRef.current = gridRef.current.map((row) => [...row].reverse())
        gridChangedRef.current = true
        drawGrid()
        addToHistory()
        updateCharData()
        forceUpdate({})
    }, [drawGrid, addToHistory, updateCharData])

    const flipVertical = useCallback(() => {
        gridRef.current = [...gridRef.current].reverse().map((row) => [...row])
        gridChangedRef.current = true
        drawGrid()
        addToHistory()
        updateCharData()
        forceUpdate({})
    }, [drawGrid, addToHistory, updateCharData])

    const rotateClockwise = useCallback(() => {
        const newGrid: number[][] = Array(width)
            .fill(0)
            .map(() => Array(height).fill(0))

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                newGrid[x][height - 1 - y] = gridRef.current[y][x]
            }
        }

        gridRef.current = newGrid
        gridChangedRef.current = true
        drawGrid()
        addToHistory()
        updateCharData()
        forceUpdate({})
    }, [width, height, drawGrid, addToHistory, updateCharData])

    const rotateCounterClockwise = useCallback(() => {
        const newGrid: number[][] = Array(width)
            .fill(0)
            .map(() => Array(height).fill(0))

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                newGrid[width - 1 - x][y] = gridRef.current[y][x]
            }
        }

        gridRef.current = newGrid
        gridChangedRef.current = true
        drawGrid()
        addToHistory()
        updateCharData()
        forceUpdate({})
    }, [width, height, drawGrid, addToHistory, updateCharData])

    const shift = useCallback(
        (direction: "up" | "down" | "left" | "right") => {
            const newGrid: number[][] = Array(height)
                .fill(0)
                .map(() => Array(width).fill(0))

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let newX = x
                    let newY = y

                    if (direction === "up") {
                        newY = (y + height - 1) % height
                    } else if (direction === "down") {
                        newY = (y + 1) % height
                    } else if (direction === "left") {
                        newX = (x + width - 1) % width
                    } else if (direction === "right") {
                        newX = (x + 1) % width
                    }

                    newGrid[newY][newX] = gridRef.current[y][x]
                }
            }

            gridRef.current = newGrid
            gridChangedRef.current = true
            drawGrid()
            addToHistory()
            updateCharData()
            forceUpdate({})
        },
        [width, height, drawGrid, addToHistory, updateCharData],
    )

    const clear = useCallback(() => {
        gridRef.current = Array(height)
            .fill(0)
            .map(() => Array(width).fill(0))

        gridChangedRef.current = true
        drawGrid()
        addToHistory()
        updateCharData()
        forceUpdate({})
    }, [width, height, drawGrid, addToHistory, updateCharData])

    const undo = useCallback(() => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current--
            gridRef.current = historyRef.current[historyIndexRef.current].map((row) => [...row])
            gridChangedRef.current = true
            drawGrid()
            updateCharData()
            forceUpdate({})
        }
    }, [drawGrid, updateCharData])

    const redo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++
            gridRef.current = historyRef.current[historyIndexRef.current].map((row) => [...row])
            gridChangedRef.current = true
            drawGrid()
            updateCharData()
            forceUpdate({})
        }
    }, [drawGrid, updateCharData])

    const copy = useCallback(() => {
        clipboardRef.current = gridRef.current.map((row) => [...row])
        forceUpdate({})
    }, [])

    const paste = useCallback(() => {
        if (clipboardRef.current) {
            gridRef.current = clipboardRef.current.map((row) => [...row])
            gridChangedRef.current = true
            drawGrid()
            addToHistory()
            updateCharData()
            forceUpdate({})
        }
    }, [drawGrid, addToHistory, updateCharData])

    // Ensure final state is saved when component unmounts
    useEffect(() => {
        return () => {
            if (gridChangedRef.current) {
                const binaryData = gridToBinary(gridRef.current)
                onDataChange?.(binaryData)
            }

            // Clear any debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [onDataChange])

    // Global mouse up handler
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDraggingRef.current) {
                handleMouseUp()
            }
        }

        window.addEventListener("mouseup", handleGlobalMouseUp)
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp)
    }, [handleMouseUp])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={flipHorizontal}
                    variant="outline"
                    size="icon"
                >
                    <FlipHorizontal className="w-4 h-4" />
                </Button>
                <Button
                    onClick={flipVertical}
                    variant="outline"
                    size="icon"
                >
                    <FlipVertical className="w-4 h-4" />
                </Button>
                <Button
                    onClick={rotateClockwise}
                    variant="outline"
                    size="icon"
                >
                    <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                    onClick={rotateCounterClockwise}
                    variant="outline"
                    size="icon"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => shift("up")}
                    variant="outline"
                    size="icon"
                >
                    <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => shift("down")}
                    variant="outline"
                    size="icon"
                >
                    <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => shift("left")}
                    variant="outline"
                    size="icon"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => shift("right")}
                    variant="outline"
                    size="icon"
                >
                    <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                    onClick={clear}
                    variant="outline"
                    size="icon"
                >
                    <Eraser className="w-4 h-4" />
                </Button>
                <Button
                    onClick={undo}
                    disabled={historyIndexRef.current <= 0}
                    variant="outline"
                    size="icon"
                >
                    <Undo className="w-4 h-4" />
                </Button>
                <Button
                    onClick={redo}
                    disabled={historyIndexRef.current >= historyRef.current.length - 1}
                    variant="outline"
                    size="icon"
                >
                    <Redo className="w-4 h-4" />
                </Button>
                <Button
                    onClick={copy}
                    variant="outline"
                    size="icon"
                >
                    <Copy className="w-4 h-4" />
                </Button>
                <Button
                    onClick={paste}
                    disabled={!clipboardRef.current}
                    variant="outline"
                    size="icon"
                >
                    <Paste className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex flex-row gap-4 items-start">
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        className="cursor-crosshair dark:invert border-[0.5px] border-neutral-300"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                </div>
                <div className="flex flex-col items-center border p-2 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-center p-2 bg-white dark:bg-gray-700 rounded-xs border mb-2" style={{ width: '100px', height: '100px' }}>
                        <canvas
                            ref={previewRef}
                            className="dark:invert border-[0.25px] border-neutral-300"
                            style={{
                                imageRendering: "pixelated",
                                transform: "scale(4)",
                                transformOrigin: "center"
                            }}
                        />
                    </div>
                    <span className="text-lg font-mono">{String.fromCharCode(parseInt(selectedCharacter))} {selectedCharacter}</span>
                </div>
            </div>

        </div>
    )
} 