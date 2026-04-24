"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { cn } from "@/lib/utils";

export interface PreviewFrame {
	id: string;
	screen_id: string;
	duration: number;
	label: string;
}

interface PlaylistLivePreviewProps {
	frames: PreviewFrame[];
	activeIndex: number;
	onActiveIndexChange: (index: number) => void;
}

export function PlaylistLivePreview({
	frames,
	activeIndex,
	onActiveIndexChange,
}: PlaylistLivePreviewProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);

	const active = frames[activeIndex];
	const duration = Math.max(1, active?.duration ?? 30);
	const isEmpty = frames.length === 0;

	// Stash dynamic values in refs so the RAF loop sees the latest without
	// restarting on every frame change.
	const stateRef = useRef({
		frames,
		activeIndex,
		duration,
		onActiveIndexChange,
	});
	stateRef.current = { frames, activeIndex, duration, onActiveIndexChange };

	// Reset progress whenever the active frame changes.
	const prevIndexRef = useRef(activeIndex);
	useEffect(() => {
		if (prevIndexRef.current !== activeIndex) {
			prevIndexRef.current = activeIndex;
			setProgress(0);
		}
	}, [activeIndex]);

	// Drive the playback loop. Restart only when play/pause or emptiness flips.
	useEffect(() => {
		if (!isPlaying || isEmpty) return;

		let raf = 0;
		let startedAt = performance.now();
		let lastIndex = stateRef.current.activeIndex;

		const tick = (t: number) => {
			const s = stateRef.current;
			// If the active frame changed externally, resync the clock.
			if (s.activeIndex !== lastIndex) {
				lastIndex = s.activeIndex;
				startedAt = t;
			}
			const elapsed = t - startedAt;
			const ratio = elapsed / (s.duration * 1000);

			if (ratio >= 1) {
				const next = (s.activeIndex + 1) % s.frames.length;
				lastIndex = next;
				startedAt = t;
				s.onActiveIndexChange(next);
				setProgress(0);
			} else {
				setProgress(ratio);
			}
			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [isPlaying, isEmpty]);

	const goTo = useCallback((index: number) => {
		const len = stateRef.current.frames.length;
		if (len === 0) return;
		const next = ((index % len) + len) % len;
		stateRef.current.onActiveIndexChange(next);
	}, []);

	return (
		<div className="flex flex-col gap-4">
			<div className="relative mx-auto w-full max-w-[640px]">
				<div className="relative rounded-[28px] bg-neutral-900 p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/20 dark:ring-white/5">
					<div className="relative overflow-hidden rounded-[16px] border border-black/40 bg-neutral-100">
						<div
							className="relative"
							style={{
								aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
							}}
						>
							{isEmpty ? (
								<div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
									Add a frame to preview the playlist
								</div>
							) : (
								<picture key={active.id}>
									<source
										srcSet={`/api/bitmap/${active.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
										type="image/bmp"
									/>
									<img
										src={`/api/bitmap/${active.screen_id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
										alt={active.label}
										width={DEFAULT_IMAGE_WIDTH}
										height={DEFAULT_IMAGE_HEIGHT}
										className="absolute inset-0 h-full w-full object-cover"
										style={{ imageRendering: "pixelated" }}
									/>
								</picture>
							)}
						</div>
					</div>

					<div className="mt-3 flex items-center gap-2 px-1">
						<div
							className={cn(
								"h-2 w-2 rounded-full transition-colors",
								isPlaying && !isEmpty ? "bg-emerald-400" : "bg-neutral-600",
							)}
							aria-hidden
						/>
						<div className="flex-1 overflow-hidden rounded-full bg-neutral-800">
							<div
								className="h-1.5 bg-neutral-100 transition-[width] duration-100 ease-linear"
								style={{
									width: `${Math.min(100, progress * 100)}%`,
								}}
							/>
						</div>
						<span className="text-xs tabular-nums text-neutral-400">
							{Math.max(0, Math.ceil(duration * (1 - progress)))}s
						</span>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2">
				<div className="text-sm text-muted-foreground">
					{isEmpty ? (
						<span>No frames</span>
					) : (
						<>
							<span className="font-medium tabular-nums text-foreground">
								{activeIndex + 1}
							</span>
							<span className="tabular-nums"> / {frames.length}</span>
							<span className="mx-2">·</span>
							<span className="truncate">{active.label}</span>
						</>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => goTo(activeIndex - 1)}
						disabled={isEmpty}
						aria-label="Previous frame"
					>
						<SkipBack className="h-4 w-4" />
					</Button>
					<Button
						variant="default"
						size="icon"
						onClick={() => setIsPlaying((p) => !p)}
						disabled={isEmpty}
						aria-label={isPlaying ? "Pause" : "Play"}
					>
						{isPlaying ? (
							<Pause className="h-4 w-4" />
						) : (
							<Play className="h-4 w-4" />
						)}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => goTo(activeIndex + 1)}
						disabled={isEmpty}
						aria-label="Next frame"
					>
						<SkipForward className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
