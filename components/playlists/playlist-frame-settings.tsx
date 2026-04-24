"use client";

import { Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface FrameData {
	id: string;
	screen_id: string;
	duration: number;
	order_index: number;
	start_time?: string;
	end_time?: string;
	days_of_week?: string[];
}

interface PlaylistFrameSettingsProps {
	frame: FrameData;
	index: number;
	screenOptions: { id: string; name: string }[];
	onUpdate: (id: string, data: Partial<FrameData>) => void;
	onDelete: (id: string) => void;
}

const daysOfWeek = [
	{ value: "monday", label: "M" },
	{ value: "tuesday", label: "T" },
	{ value: "wednesday", label: "W" },
	{ value: "thursday", label: "T" },
	{ value: "friday", label: "F" },
	{ value: "saturday", label: "S" },
	{ value: "sunday", label: "S" },
];

export function PlaylistFrameSettings({
	frame,
	index,
	screenOptions,
	onUpdate,
	onDelete,
}: PlaylistFrameSettingsProps) {
	return (
		<div className="flex h-full flex-col gap-5 rounded-2xl border bg-card p-5">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Frame {index + 1}
					</div>
					<h3 className="text-lg font-semibold">Frame settings</h3>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => onDelete(frame.id)}
					className="text-muted-foreground hover:text-destructive"
					aria-label="Delete frame"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			<div className="space-y-2">
				<Label htmlFor={`screen-${frame.id}`}>Screen</Label>
				<Select
					value={frame.screen_id}
					onValueChange={(value) => onUpdate(frame.id, { screen_id: value })}
				>
					<SelectTrigger id={`screen-${frame.id}`}>
						<SelectValue placeholder="Select a screen" />
					</SelectTrigger>
					<SelectContent>
						{screenOptions.map((screen) => (
							<SelectItem key={screen.id} value={screen.id}>
								{screen.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label htmlFor={`duration-${frame.id}`}>Duration</Label>
					<div className="flex items-center gap-2">
						<Input
							id={`duration-${frame.id}`}
							type="number"
							min={1}
							max={3600}
							value={frame.duration}
							onChange={(e) =>
								onUpdate(frame.id, {
									duration: Math.max(1, parseInt(e.target.value, 10) || 30),
								})
							}
							className="h-8 w-20 text-right tabular-nums"
						/>
						<span className="text-xs text-muted-foreground">sec</span>
					</div>
				</div>
				<Slider
					value={[Math.min(300, frame.duration)]}
					min={5}
					max={300}
					step={5}
					onValueChange={([v]) =>
						onUpdate(frame.id, { duration: Math.max(1, v ?? 30) })
					}
				/>
				<div className="flex justify-between text-[10px] text-muted-foreground">
					<span>5s</span>
					<span>2m 30s</span>
					<span>5m</span>
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label>Days</Label>
					{frame.days_of_week && frame.days_of_week.length > 0 && (
						<button
							type="button"
							className="text-xs text-muted-foreground hover:text-foreground"
							onClick={() => onUpdate(frame.id, { days_of_week: undefined })}
						>
							Clear
						</button>
					)}
				</div>
				<ToggleGroup
					type="multiple"
					variant="outline"
					size="sm"
					value={frame.days_of_week || []}
					onValueChange={(value) =>
						onUpdate(frame.id, {
							days_of_week: value.length ? value : undefined,
						})
					}
					className="grid grid-cols-7 gap-1"
				>
					{daysOfWeek.map((day, i) => (
						<ToggleGroupItem
							key={day.value}
							value={day.value}
							aria-label={day.value}
							className="h-8 w-full p-0"
						>
							<span className="text-xs font-semibold">{day.label}</span>
							<span className="sr-only">{i}</span>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<p className="text-[11px] text-muted-foreground">
					{frame.days_of_week?.length
						? "Only shows on selected days."
						: "Shows every day."}
				</p>
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Clock className="h-3.5 w-3.5 text-muted-foreground" />
					<Label>Time window</Label>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Input
						type="time"
						value={frame.start_time || ""}
						onChange={(e) =>
							onUpdate(frame.id, {
								start_time: e.target.value || undefined,
							})
						}
						aria-label="Start time"
					/>
					<Input
						type="time"
						value={frame.end_time || ""}
						onChange={(e) =>
							onUpdate(frame.id, {
								end_time: e.target.value || undefined,
							})
						}
						aria-label="End time"
					/>
				</div>
				<p className="text-[11px] text-muted-foreground">
					{frame.start_time || frame.end_time
						? "Active only in this window."
						: "Always active."}
				</p>
			</div>
		</div>
	);
}
