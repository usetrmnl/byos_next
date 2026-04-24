"use client";

import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { cn } from "@/lib/utils";

export interface FilmstripFrame {
	id: string;
	screen_id: string;
	duration: number;
	label: string;
}

interface PlaylistFilmstripProps {
	frames: FilmstripFrame[];
	activeIndex: number;
	onSelect: (index: number) => void;
	onReorder: (from: number, to: number) => void;
	onAdd: () => void;
}

export function PlaylistFilmstrip({
	frames,
	activeIndex,
	onSelect,
	onReorder,
	onAdd,
}: PlaylistFilmstripProps) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [overIndex, setOverIndex] = useState<number | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);

	const totalSeconds = frames.reduce((sum, f) => sum + f.duration, 0);
	const totalLabel = formatDuration(totalSeconds);

	return (
		<div className="rounded-2xl border bg-card">
			<div className="flex items-center justify-between gap-4 border-b px-4 py-2.5">
				<div className="flex items-center gap-2 text-sm">
					<span className="font-medium">Timeline</span>
					<span className="text-muted-foreground">
						{frames.length} {frames.length === 1 ? "frame" : "frames"} ·{" "}
						{totalLabel} loop
					</span>
				</div>
			</div>

			<div
				ref={scrollerRef}
				className="flex items-stretch gap-3 overflow-x-auto p-4 [scrollbar-width:thin]"
			>
				{/* Film perforations top + bottom, rendered per-frame below */}
				{frames.map((frame, index) => {
					const isActive = index === activeIndex;
					const isOver =
						overIndex === index && dragIndex !== null && dragIndex !== index;

					return (
						<button
							type="button"
							key={frame.id}
							draggable
							onClick={() => onSelect(index)}
							onDragStart={(e) => {
								setDragIndex(index);
								e.dataTransfer.effectAllowed = "move";
								e.dataTransfer.setData("text/plain", String(index));
							}}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
								if (overIndex !== index) setOverIndex(index);
							}}
							onDragLeave={() => {
								if (overIndex === index) setOverIndex(null);
							}}
							onDrop={(e) => {
								e.preventDefault();
								if (dragIndex !== null && dragIndex !== index) {
									onReorder(dragIndex, index);
								}
								setDragIndex(null);
								setOverIndex(null);
							}}
							onDragEnd={() => {
								setDragIndex(null);
								setOverIndex(null);
							}}
							className={cn(
								"group relative shrink-0 cursor-grab active:cursor-grabbing",
								"w-[180px] overflow-hidden rounded-xl border-2 bg-neutral-900 transition-all",
								isActive
									? "border-primary shadow-[0_0_0_3px] shadow-primary/20"
									: "border-transparent hover:border-border",
								isOver &&
									"ring-2 ring-primary ring-offset-2 ring-offset-background",
								dragIndex === index && "opacity-40",
							)}
							aria-label={`Frame ${index + 1}: ${frame.label}`}
							aria-pressed={isActive}
						>
							<FilmPerforations />

							<div className="px-3 py-2">
								<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
									<span className="tabular-nums">#{index + 1}</span>
									<span className="tabular-nums">{frame.duration}s</span>
								</div>
							</div>

							<div
								className="relative mx-3 overflow-hidden rounded-md border border-black/60 bg-neutral-100"
								style={{
									aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
								}}
							>
								<picture>
									<source
										srcSet={`/api/bitmap/${frame.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
										type="image/bmp"
									/>
									<img
										src={`/api/bitmap/${frame.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
										alt={frame.label}
										width={DEFAULT_IMAGE_WIDTH}
										height={DEFAULT_IMAGE_HEIGHT}
										className="absolute inset-0 h-full w-full object-cover"
										style={{ imageRendering: "pixelated" }}
									/>
								</picture>
							</div>

							<div className="px-3 py-2">
								<div className="truncate text-xs font-medium text-neutral-100">
									{frame.label}
								</div>
							</div>

							<FilmPerforations />
						</button>
					);
				})}

				<button
					type="button"
					onClick={onAdd}
					className={cn(
						"flex w-[180px] shrink-0 flex-col items-center justify-center gap-2",
						"rounded-xl border-2 border-dashed border-border bg-muted/30",
						"text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary",
					)}
					aria-label="Add frame"
				>
					<Plus className="h-6 w-6" />
					<span className="text-sm font-medium">Add frame</span>
				</button>
			</div>
		</div>
	);
}

function FilmPerforations() {
	return (
		<div className="flex h-3 items-center justify-around bg-neutral-950 px-1">
			{Array.from({ length: 8 }).map((_, i) => (
				<span
					key={i}
					className="h-1.5 w-2 rounded-[2px] bg-neutral-800"
					aria-hidden
				/>
			))}
		</div>
	);
}

function formatDuration(seconds: number): string {
	if (seconds <= 0) return "0s";
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	if (m === 0) return `${s}s`;
	if (s === 0) return `${m}m`;
	return `${m}m ${s}s`;
}
