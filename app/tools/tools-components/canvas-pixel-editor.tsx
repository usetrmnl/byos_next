"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface CanvasPixelEditorProps {
    width: number
    height: number
    pixelSize?: number
    className?: string
}

export default function CanvasPixelEditor({
    width,
    height,
    pixelSize = 20,
    className,
}: CanvasPixelEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDraggingRef = useRef(false)
    const lastUpdateRef = useRef<number>(0)
    const dragStateRef = useRef<boolean | null>(null)
    const lastUpdatedIndexRef = useRef<{ x: number; y: number } | null>(null)
    const [pixels, setPixels] = useState<boolean[][]>(() => 
        Array(height).fill(false).map(() => Array(width).fill(false))
    )

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        canvas.width = width * pixelSize
        canvas.height = height * pixelSize

        // Draw initial grid
        drawGrid(ctx)
    }, [width, height, pixelSize])

    // Draw grid and pixels
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
        // Clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        // Draw pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (pixels[y][x]) {
                    ctx.fillStyle = 'black'
                    ctx.fillRect(
                        x * pixelSize,
                        y * pixelSize,
                        pixelSize,
                        pixelSize
                    )
                }
            }
        }

        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 0.5

        // Vertical lines
        for (let x = 0; x <= width; x++) {
            ctx.beginPath()
            ctx.moveTo(x * pixelSize, 0)
            ctx.lineTo(x * pixelSize, height * pixelSize)
            ctx.stroke()
        }

        // Horizontal lines
        for (let y = 0; y <= height; y++) {
            ctx.beginPath()
            ctx.moveTo(0, y * pixelSize)
            ctx.lineTo(width * pixelSize, y * pixelSize)
            ctx.stroke()
        }
    }, [width, height, pixelSize, pixels])

    // Update pixels and redraw
    const updatePixels = useCallback((newPixels: boolean[][]) => {
        setPixels(newPixels)
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        drawGrid(ctx)
    }, [drawGrid])

    // Get pixel coordinates from mouse event
    const getPixelCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return null

        const rect = canvas.getBoundingClientRect()
        const x = Math.floor((e.clientX - rect.left) / pixelSize)
        const y = Math.floor((e.clientY - rect.top) / pixelSize)
        return { x, y }
    }, [pixelSize])

    // Handle mouse down
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        const coords = getPixelCoordinates(e)
        if (!coords || coords.x < 0 || coords.x >= width || coords.y < 0 || coords.y >= height) return

        isDraggingRef.current = true
        // Store the current state of the pixel we clicked on
        const currentState = pixels[coords.y][coords.x]
        // Set the drawing state to the opposite of what we clicked
        dragStateRef.current = !currentState
        lastUpdatedIndexRef.current = coords

        // Update initial pixel to the opposite state
        const newPixels = pixels.map(row => [...row])
        newPixels[coords.y][coords.x] = dragStateRef.current
        updatePixels(newPixels)
    }, [getPixelCoordinates, pixels, width, height, updatePixels])

    // Handle mouse move
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDraggingRef.current || dragStateRef.current === null || !lastUpdatedIndexRef.current) return

        const now = Date.now()
        // Limit updates to 60fps
        if (now - lastUpdateRef.current < 16) return
        lastUpdateRef.current = now

        const coords = getPixelCoordinates(e)
        if (!coords || coords.x < 0 || coords.x >= width || coords.y < 0 || coords.y >= height) return

        // Calculate line between last point and current point using Bresenham's algorithm
        const lastX = lastUpdatedIndexRef.current.x
        const lastY = lastUpdatedIndexRef.current.y
        const currentX = coords.x
        const currentY = coords.y

        const dx = Math.abs(currentX - lastX)
        const dy = Math.abs(currentY - lastY)
        const sx = lastX < currentX ? 1 : -1
        const sy = lastY < currentY ? 1 : -1
        let err = dx - dy

        let x = lastX
        let y = lastY
        const newPixels = pixels.map(row => [...row])

        while (true) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                // Set pixels to the drawing state (opposite of what we clicked)
                newPixels[y][x] = dragStateRef.current
            }

            if (x === currentX && y === currentY) break

            const e2 = 2 * err
            if (e2 > -dy) {
                err -= dy
                x += sx
            }
            if (e2 < dx) {
                err += dx
                y += sy
            }
        }

        lastUpdatedIndexRef.current = coords
        updatePixels(newPixels)
    }, [getPixelCoordinates, pixels, width, height, updatePixels])

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false
        dragStateRef.current = null
        lastUpdatedIndexRef.current = null
    }, [])

    // Add global mouse up listener
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDraggingRef.current) {
                handleMouseUp()
            }
        }

        window.addEventListener('mouseup', handleGlobalMouseUp)
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
    }, [handleMouseUp])

    return (
        <canvas
            ref={canvasRef}
            className={cn(
                "border border-gray-200 dark:border-gray-800 rounded-lg",
                "cursor-crosshair select-none",
                className
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            role="img"
            aria-label="Pixel editor canvas"
        />
    )
} 