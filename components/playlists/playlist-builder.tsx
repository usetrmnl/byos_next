"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchPlaylistWithItems } from "@/app/actions/playlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlaylistFilmstrip } from "./playlist-filmstrip";
import {
	type FrameData,
	PlaylistFrameSettings,
} from "./playlist-frame-settings";
import { PlaylistLivePreview } from "./playlist-live-preview";

interface PlaylistBuilderProps {
	playlist?: {
		id: string;
		name: string;
		items?: FrameData[];
	};
	recipes: Recipe[];
	onSave: (data: { id?: string; name: string; items: FrameData[] }) => void;
	onCancel: () => void;
	isSaving?: boolean;
}

export function PlaylistBuilder({
	playlist,
	recipes,
	onSave,
	onCancel,
	isSaving = false,
}: PlaylistBuilderProps) {
	const [name, setName] = useState(playlist?.name || "");
	const [items, setItems] = useState<FrameData[]>(playlist?.items || []);
	const [activeIndex, setActiveIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);

	const screenOptions = useMemo(
		() => recipes.map((r) => ({ id: r.slug, name: r.name })),
		[recipes],
	);

	const nameByScreenId = useMemo(() => {
		const map = new Map<string, string>();
		for (const r of recipes) map.set(r.slug, r.name);
		return map;
	}, [recipes]);

	// Hydrate items if editing and we don't have them yet
	useEffect(() => {
		const loadItems = async () => {
			if (playlist?.id && (!playlist.items || playlist.items.length === 0)) {
				setIsLoading(true);
				try {
					const result = await fetchPlaylistWithItems(playlist.id);
					if (result.playlist) setName(result.playlist.name);
					setItems(
						result.items.map((item) => ({
							id: item.id,
							screen_id: item.screen_id,
							duration: item.duration,
							order_index: item.order_index,
							start_time: item.start_time ?? undefined,
							end_time: item.end_time ?? undefined,
							days_of_week: item.days_of_week ?? undefined,
						})),
					);
				} finally {
					setIsLoading(false);
				}
			}
		};
		loadItems();
	}, [playlist?.id, playlist?.items]);

	useEffect(() => {
		if (activeIndex > items.length - 1) {
			setActiveIndex(Math.max(0, items.length - 1));
		}
	}, [items.length, activeIndex]);

	const handleAdd = () => {
		const defaultSlug = recipes[0]?.slug || "simple-text";
		const newItem: FrameData = {
			id: `temp-${Date.now()}`,
			screen_id: defaultSlug,
			duration: 30,
			order_index: items.length,
			start_time: undefined,
			end_time: undefined,
			days_of_week: undefined,
		};
		setItems([...items, newItem]);
		setActiveIndex(items.length);
	};

	const handleUpdate = (id: string, patch: Partial<FrameData>) => {
		setItems((current) =>
			current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
		);
	};

	const handleDelete = (id: string) => {
		setItems((current) => {
			const next = current
				.filter((item) => item.id !== id)
				.map((item, i) => ({ ...item, order_index: i }));
			return next;
		});
	};

	const handleReorder = (from: number, to: number) => {
		if (from === to) return;
		setItems((current) => {
			const copy = [...current];
			const [moved] = copy.splice(from, 1);
			copy.splice(to, 0, moved);
			return copy.map((item, i) => ({ ...item, order_index: i }));
		});
		setActiveIndex(to);
	};

	const handleSave = () => {
		if (!name.trim()) return;
		onSave({
			id: playlist?.id,
			name: name.trim(),
			items: items.map((item, i) => ({ ...item, order_index: i })),
		});
	};

	const previewFrames = items.map((item) => ({
		id: item.id,
		screen_id: item.screen_id,
		duration: item.duration,
		label: nameByScreenId.get(item.screen_id) || item.screen_id,
	}));

	const totalSeconds = items.reduce((sum, item) => sum + item.duration, 0);
	const totalLabel = formatLoop(totalSeconds);

	const activeItem = items[activeIndex];

	return (
		<div className="flex flex-col gap-4">
			{/* Top bar */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						onClick={onCancel}
						aria-label="Back to playlists"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{playlist ? "Editing playlist" : "New playlist"}
						</span>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Untitled playlist"
							className={cn(
								"h-auto border-0 bg-transparent p-0 text-lg font-semibold shadow-none",
								"focus-visible:ring-0 focus-visible:ring-offset-0",
							)}
						/>
					</div>
				</div>
				<div className="flex items-center gap-4">
					<div className="hidden text-right text-xs text-muted-foreground sm:block">
						<div className="font-semibold tabular-nums text-foreground">
							{totalLabel}
						</div>
						<div>
							{items.length} {items.length === 1 ? "frame" : "frames"}
						</div>
					</div>
					<Button variant="outline" onClick={onCancel} disabled={isSaving}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!name.trim() || isSaving}>
						<Save className="mr-2 h-4 w-4" />
						{playlist ? "Update" : "Create"}
					</Button>
				</div>
			</div>

			{/* Main split: preview + settings */}
			<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
				<div className="rounded-2xl border bg-card p-5">
					{isLoading ? (
						<div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
							Loading playlist…
						</div>
					) : (
						<PlaylistLivePreview
							frames={previewFrames}
							activeIndex={activeIndex}
							onActiveIndexChange={setActiveIndex}
						/>
					)}
				</div>

				<div>
					{activeItem ? (
						<PlaylistFrameSettings
							frame={activeItem}
							index={activeIndex}
							screenOptions={screenOptions}
							onUpdate={handleUpdate}
							onDelete={handleDelete}
						/>
					) : (
						<div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
							<div className="text-sm font-medium">No frame selected</div>
							<p className="mt-1 text-xs text-muted-foreground">
								Add a frame below to start building your loop.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Filmstrip */}
			<PlaylistFilmstrip
				frames={previewFrames}
				activeIndex={activeIndex}
				onSelect={setActiveIndex}
				onReorder={handleReorder}
				onAdd={handleAdd}
			/>
		</div>
	);
}

function formatLoop(seconds: number): string {
	if (seconds <= 0) return "0s loop";
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	if (m === 0) return `${s}s loop`;
	if (s === 0) return `${m}m loop`;
	return `${m}m ${s}s loop`;
}
