"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const maxGridSize = 17;

// make google doc style boxes to add grid size, from 4x4 to 17x17, disable adding if the size is already in the list or too small

export default function AddGridSize({
	availableGridSizes,
	onAddSize,
}: {
	availableGridSizes: string[];
	onAddSize: (newSize: string) => void;
}) {
	const [hoveredSize, setHoveredSize] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const cellSize = 8; // 2px for cell + gap
	const canvasSize = maxGridSize * cellSize;

	// Draw the grid on canvas
	const renderCanvas = useCallback(() => {
		if (!canvasRef.current) return;

		// Use requestAnimationFrame to ensure the browser is ready to render
		requestAnimationFrame(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			// Clear canvas
			ctx.clearRect(0, 0, canvasSize, canvasSize);

			// Draw all cells
			for (let rowIdx = 1; rowIdx <= maxGridSize; rowIdx++) {
				for (let colIdx = 1; colIdx <= maxGridSize; colIdx++) {
					const size = `${colIdx}x${rowIdx}`;
					const isDisabled =
						availableGridSizes.includes(size) || (colIdx <= 4 && rowIdx <= 4);

					const x = (colIdx - 1) * cellSize;
					const y = (rowIdx - 1) * cellSize;

					// Fill cell background
					ctx.fillStyle = isDisabled ? "rgba(229, 231, 235, 0.5)" : "#e5e7eb";
					if (size === hoveredSize && !isDisabled) {
						ctx.fillStyle = "#3b82f6"; // blue-500
					}
					ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
				}
			}
		});
	}, [hoveredSize, availableGridSizes, canvasSize]);

	// Initial render when dropdown opens
	useEffect(() => {
		if (open) {
			// Add a small delay to ensure the canvas is in the DOM
			const timer = setTimeout(() => {
				renderCanvas();
			}, 50);

			return () => clearTimeout(timer);
		}
	}, [open, availableGridSizes, renderCanvas]);

	// Re-render on hover changes
	useEffect(() => {
		if (open) {
			renderCanvas();
		}
	}, [hoveredSize, open, renderCanvas]);

	// Handle canvas interactions
	const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) / cellSize) + 1;
		const y = Math.floor((e.clientY - rect.top) / cellSize) + 1;

		if (x >= 1 && x <= maxGridSize && y >= 1 && y <= maxGridSize) {
			const size = `${x}x${y}`;
			setHoveredSize(size);
		} else {
			setHoveredSize(null);
		}
	};

	const handleCanvasClick = () => {
		const canvas = canvasRef.current;
		if (!canvas || !hoveredSize) return;

		const [colIdx, rowIdx] = hoveredSize.split("x").map(Number);
		const isDisabled =
			availableGridSizes.includes(hoveredSize) || (colIdx <= 4 && rowIdx <= 4);

		if (!isDisabled) {
			onAddSize(hoveredSize);
			toast.success(`Added grid size: ${hoveredSize}`);
			setOpen(false); // Close dropdown when size is selected
		}
	};

	const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
		if ((e.key === "Enter" || e.key === " ") && hoveredSize) {
			const [colIdx, rowIdx] = hoveredSize.split("x").map(Number);
			const isDisabled =
				availableGridSizes.includes(hoveredSize) ||
				(colIdx <= 4 && rowIdx <= 4);

			if (!isDisabled) {
				onAddSize(hoveredSize);
				toast.success(`Added grid size: ${hoveredSize}`);
				setOpen(false); // Close dropdown when size is selected
			}
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					Add Grid Size
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="p-2"
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<DropdownMenuLabel>
					{hoveredSize ? hoveredSize : "Select Grid Size"}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div
					className="relative cursor-pointer"
					onMouseLeave={() => setHoveredSize(null)}
				>
					<canvas
						ref={canvasRef}
						width={canvasSize}
						height={canvasSize}
						onMouseMove={handleCanvasMouseMove}
						onClick={handleCanvasClick}
						onKeyDown={handleCanvasKeyDown}
						tabIndex={0}
						aria-label="Grid size selector"
						className="focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
