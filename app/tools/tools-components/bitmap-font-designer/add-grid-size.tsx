"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useState } from "react"

const maxGridSize = 17

// make google doc style boxes to add grid size, from 4x4 to 17x17, disable adding if the size is already in the list or too small



export default function AddGridSize({ setAvailableGridSizes, availableGridSizes }: { setAvailableGridSizes: React.Dispatch<React.SetStateAction<string[]>>, availableGridSizes: string[] }) {
    const [hoveredSize, setHoveredSize] = useState<string | null>(null)
    // make a grid of 17x17 boxes, each box is a button, when clicked, add the size to the list
    const gridBtnIndexes = []
    for (let rowIdx = 1; rowIdx <= maxGridSize; rowIdx++) {
        for (let colIdx = 1; colIdx <= maxGridSize; colIdx++) {
            gridBtnIndexes.push(`${colIdx}x${rowIdx}`)
        }
    }

    const handleGridSizeClick = (size: string) => {
        const newAvailableGridSizes = [...availableGridSizes, size].sort((a, b) => parseInt(a.split('x')[0]) - parseInt(b.split('x')[0]))
        setAvailableGridSizes(newAvailableGridSizes)
        toast.success(`Added grid size: ${size}`)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors">Add Grid Size</DropdownMenuTrigger>
            <DropdownMenuContent className="p-2">
                <DropdownMenuLabel>{hoveredSize ? hoveredSize : "Select Grid Size"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div
                    className="grid grid-cols-17 gap-0.5 relative cursor-pointer"
                    onMouseLeave={() => setHoveredSize(null)}
                >
                    {gridBtnIndexes.map((size) => {
                        const isDisabled = availableGridSizes.includes(size) || (parseInt(size.split('x')[0]) <= 4 && parseInt(size.split('x')[1]) <= 4)
                        return (
                            <div
                                key={size}
                                className={cn(
                                    "size-2 gap-0 p-0 m-0",
                                    isDisabled
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed"
                                        : "bg-gray-200 hover:bg-blue-500"
                                )}
                                onClick={() => !isDisabled && handleGridSizeClick(size)}
                                onMouseEnter={() => setHoveredSize(size)}
                                role="button"
                                tabIndex={isDisabled ? -1 : 0}
                                aria-label={`Grid size ${size}`}
                                onKeyDown={(e) => {
                                    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                                        handleGridSizeClick(size)
                                    }
                                }}
                            />
                        )
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
