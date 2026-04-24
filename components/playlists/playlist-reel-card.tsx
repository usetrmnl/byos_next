"use client";

import { Edit3, Film, Trash2 } from "lucide-react";
import { FormattedDate } from "@/components/common/formatted-date";
import { Button } from "@/components/ui/button";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Playlist, PlaylistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlaylistReelCardProps {
	playlist: Playlist;
	items: PlaylistItem[];
	getRecipeName: (screenId: string) => string;
	onEdit: () => void;
	onDelete: () => void;
	disabled?: boolean;
}

const MAX_PREVIEWS = 5;

export function PlaylistReelCard({
	playlist,
	items,
	getRecipeName,
	onEdit,
	onDelete,
	disabled,
}: PlaylistReelCardProps) {
	const previews = items.slice(0, MAX_PREVIEWS);
	const remaining = Math.max(0, items.length - previews.length);
	const totalSeconds = items.reduce((sum, it) => sum + it.duration, 0);
	const loopLabel = formatLoop(totalSeconds);

	const isEmpty = items.length === 0;

	return (
		<div
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all",
				"hover:-translate-y-0.5 hover:shadow-lg",
			)}
		>
			{/* Reel header strip */}
			<div className="relative bg-neutral-950 px-4 py-3">
				<Perforations />
				<div className="mt-2 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Film className="h-4 w-4 text-neutral-400" />
						<span className="text-sm font-semibold text-neutral-100">
							{playlist.name}
						</span>
					</div>
					<span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
						{items.length} {items.length === 1 ? "frame" : "frames"}
					</span>
				</div>
			</div>

			{/* Filmstrip of real previews */}
			<div className="relative">
				{isEmpty ? (
					<div className="flex h-28 items-center justify-center bg-muted/30 text-xs text-muted-foreground">
						Empty reel — add frames to start rotating
					</div>
				) : (
					<div
						className="grid bg-neutral-900"
						style={{
							gridTemplateColumns: `repeat(${previews.length + (remaining > 0 ? 1 : 0)}, minmax(0, 1fr))`,
						}}
					>
						{previews.map((item, i) => (
							<div
								key={item.id}
								className="relative overflow-hidden border-r border-neutral-950 last:border-r-0"
								style={{
									aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
								}}
							>
								<picture>
									<source
										srcSet={`/api/bitmap/${item.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
										type="image/bmp"
									/>
									<img
										src={`/api/bitmap/${item.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
										alt={getRecipeName(item.screen_id)}
										width={DEFAULT_IMAGE_WIDTH}
										height={DEFAULT_IMAGE_HEIGHT}
										className="h-full w-full object-cover"
										style={{ imageRendering: "pixelated" }}
									/>
								</picture>
								<div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white tabular-nums">
									{i + 1}·{item.duration}s
								</div>
							</div>
						))}
						{remaining > 0 && (
							<div
								className="flex items-center justify-center bg-neutral-800 text-xs font-semibold text-neutral-200"
								style={{
									aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
								}}
							>
								+{remaining}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Bottom perforations */}
			<div className="bg-neutral-950 px-4 py-2">
				<Perforations />
			</div>

			{/* Meta + actions */}
			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span className="font-semibold tabular-nums text-foreground">
						{loopLabel}
					</span>
					{playlist.updated_at ? (
						<FormattedDate dateString={playlist.updated_at} />
					) : (
						<span>—</span>
					)}
				</div>
				{!isEmpty && (
					<div className="flex flex-wrap gap-1.5">
						{previews.slice(0, 3).map((item) => (
							<span
								key={item.id}
								className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								{getRecipeName(item.screen_id)}
							</span>
						))}
						{items.length > 3 && (
							<span className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
								+{items.length - 3}
							</span>
						)}
					</div>
				)}
				<div className="mt-auto flex gap-2">
					<Button
						size="sm"
						variant="outline"
						className="flex-1"
						onClick={onEdit}
						disabled={disabled}
					>
						<Edit3 className="mr-1.5 h-3.5 w-3.5" />
						Edit
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={onDelete}
						disabled={disabled}
						className="text-muted-foreground hover:text-destructive"
						aria-label="Delete playlist"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}

function Perforations() {
	return (
		<div className="flex items-center justify-between gap-1.5">
			{Array.from({ length: 10 }).map((_, i) => (
				<span
					key={i}
					className="h-1.5 flex-1 rounded-[2px] bg-neutral-800"
					aria-hidden
				/>
			))}
		</div>
	);
}

function formatLoop(seconds: number): string {
	if (seconds <= 0) return "0s";
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	if (m === 0) return `${s}s loop`;
	if (s === 0) return `${m}m loop`;
	return `${m}m ${s}s loop`;
}
