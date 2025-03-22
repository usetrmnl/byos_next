"use client"

import { useCallback, useState, useEffect, useRef, memo } from "react"
import { cn } from "@/lib/utils"

interface BitmapFontEditorProps {
    selectedSize: string
    selectedCharacter: string
    binaryData: string
    onDataChange?: (newData: string) => void
}

// Memoized cell component for better performance
const Cell = memo(({ 
    isBlack, 
    index, 
    onClick, 
    onKeyDown,
    onMouseDown,
    onMouseEnter
}: { 
    isBlack: boolean
    index: number
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void
}) => (
    <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        className={cn(
            "aspect-square w-8 h-8 flex items-center justify-center cursor-pointer transition-colors",
            isBlack 
                ? "bg-black dark:bg-white" 
                : "bg-white dark:bg-gray-900",
            "hover:opacity-80"
        )}
        aria-label={`Cell ${index + 1}, ${isBlack ? 'filled' : 'empty'}`}
    />
))

Cell.displayName = 'Cell'

export default function BitmapFontEditor({
    selectedSize,
    selectedCharacter,
    binaryData,
    onDataChange,
}: BitmapFontEditorProps) {
    const [width, height] = selectedSize.split('x').map(Number)
    const [localData, setLocalData] = useState(binaryData)
    const isDraggingRef = useRef(false)
    const lastUpdateRef = useRef<number>(0)
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const dragStartStateRef = useRef<boolean | null>(null)
    const prevSizeRef = useRef(selectedSize)
    const prevCharRef = useRef(selectedCharacter)

    // Force sync when size or character changes
    useEffect(() => {
        if (selectedSize !== prevSizeRef.current || selectedCharacter !== prevCharRef.current) {
            setLocalData(binaryData)
            prevSizeRef.current = selectedSize
            prevCharRef.current = selectedCharacter
        }
    }, [selectedSize, selectedCharacter, binaryData])

    // Debounced update to parent
    const debouncedUpdate = useCallback((newData: string) => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current)
        }

        updateTimeoutRef.current = setTimeout(() => {
            onDataChange?.(newData)
        }, 100) // 100ms debounce
    }, [onDataChange])

    const updateCell = useCallback((index: number, newState: boolean) => {
        setLocalData(prevData => {
            const newData = prevData.split('')
            // Binary OR operation with previous state
            newData[index] = (newState || newData[index] === '1') ? '1' : '0'
            const updatedData = newData.join('')
            debouncedUpdate(updatedData)
            return updatedData
        })
    }, [debouncedUpdate])

    const handleCellClick = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
        e.preventDefault()
        if (isDraggingRef.current) return // Ignore clicks during drag
        
        const newState = localData[index] !== '1'
        updateCell(index, newState)
    }, [localData, updateCell])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            const newState = localData[index] !== '1'
            updateCell(index, newState)
        }
    }, [localData, updateCell])

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
        e.preventDefault()
        isDraggingRef.current = true
        dragStartStateRef.current = localData[index] === '1'
        const newState = !dragStartStateRef.current
        updateCell(index, newState)
    }, [localData, updateCell])

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
        if (!isDraggingRef.current || dragStartStateRef.current === null) return
        
        const now = Date.now()
        // Limit updates to 60fps
        if (now - lastUpdateRef.current < 16) return
        
        lastUpdateRef.current = now
        const newState = !dragStartStateRef.current
        updateCell(index, newState)
    }, [updateCell])

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false
        dragStartStateRef.current = null
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current)
            }
        }
    }, [])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Character Editor</h3>
            </div>
            
            <div 
                className="grid gap-px bg-gray-200 dark:bg-gray-700 p-1 rounded-lg"
                style={{
                    gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
                    width: 'fit-content'
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {Array.from({ length: width * height }).map((_, i) => (
                    <Cell
                        key={i}
                        isBlack={localData[i] === '1'}
                        index={i}
                        onClick={(e) => handleCellClick(e, i)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        onMouseDown={(e) => handleMouseDown(e, i)}
                        onMouseEnter={(e) => handleMouseEnter(e, i)}
                    />
                ))}
            </div>
        </div>
    )
} 