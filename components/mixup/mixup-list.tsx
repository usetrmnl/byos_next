"use client";

import { Edit3, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { FormattedDate } from "@/components/common/formatted-date";
import { Button } from "@/components/ui/button";
import { getLayoutById } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Mixup } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MixupListProps {
	mixups: Mixup[];
	onEditMixup?: (mixup: Mixup) => void;
	onDeleteMixup?: (mixupId: string) => void;
	onCreateMixup?: () => void;
	isLoading?: boolean;
}

export function MixupList({
	mixups,
	onEditMixup,
	onDeleteMixup,
	onCreateMixup,
	isLoading = false,
}: MixupListProps) {
	if (mixups.length === 0) {
		return (
			<button
				type="button"
				onClick={onCreateMixup}
				className={cn(
					"flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center",
					"transition-colors hover:border-primary hover:bg-primary/5",
				)}
			>
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
					<LayoutGrid className="h-7 w-7" />
				</div>
				<div>
					<div className="text-base font-semibold">No mixups yet</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Blend up to four recipes on one screen with a layout of your choice.
					</p>
				</div>
				<div className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
					<Plus className="h-4 w-4" />
					Create your first mixup
				</div>
			</button>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
			{mixups.map((mixup) => {
				const layout = getLayoutById(mixup.layout_id);
				const slotCount = layout?.slots.length ?? 0;
				const layoutLabel = mixup.layout_id.replace(/-/g, " ");

				return (
					<div
						key={mixup.id}
						className={cn(
							"group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all",
							"hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
						)}
					>
						<div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
							<div className="flex items-center gap-2">
								<LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									{layoutLabel}
								</span>
							</div>
							<span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
								{slotCount} slots
							</span>
						</div>

						<div
							className="relative overflow-hidden border-b bg-neutral-100"
							style={{
								aspectRatio: `${DEFAULT_IMAGE_WIDTH} / ${DEFAULT_IMAGE_HEIGHT}`,
							}}
						>
							<picture>
								<source
									srcSet={`/api/bitmap/mixup/${mixup.id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
									type="image/bmp"
								/>
								<img
									src={`/api/bitmap/mixup/${mixup.id}.bmp?width=${DEFAULT_IMAGE_WIDTH}&height=${DEFAULT_IMAGE_HEIGHT}`}
									alt={`${mixup.name} preview`}
									width={DEFAULT_IMAGE_WIDTH}
									height={DEFAULT_IMAGE_HEIGHT}
									className="absolute inset-0 h-full w-full object-cover"
									style={{ imageRendering: "pixelated" }}
								/>
							</picture>
						</div>

						<div className="flex flex-1 flex-col gap-2 p-4">
							<h3 className="text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
								{mixup.name}
							</h3>
							<p className="text-sm text-muted-foreground">
								{slotCount
									? `Combines ${slotCount} recipes in a ${layoutLabel} layout.`
									: "Mixup layout details unavailable."}
							</p>
							<div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
								<span className="capitalize">{layoutLabel}</span>
								{mixup.updated_at ? (
									<FormattedDate dateString={mixup.updated_at} />
								) : (
									<span>—</span>
								)}
							</div>
							<div className="flex gap-2 pt-2">
								<Button
									size="sm"
									variant="outline"
									className="flex-1"
									onClick={() => onEditMixup?.(mixup)}
									disabled={isLoading}
								>
									<Edit3 className="mr-1.5 h-3.5 w-3.5" />
									Edit
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => onDeleteMixup?.(mixup.id)}
									disabled={isLoading}
									className="text-muted-foreground hover:text-destructive"
									aria-label="Delete mixup"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					</div>
				);
			})}
			{onCreateMixup && (
				<button
					type="button"
					onClick={onCreateMixup}
					className={cn(
						"flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 p-6",
						"transition-colors hover:border-primary hover:bg-primary/5",
					)}
				>
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Plus className="h-6 w-6" />
					</div>
					<div className="text-center">
						<div className="text-sm font-semibold">New mixup</div>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Blend recipes onto a single screen
						</p>
					</div>
				</button>
			)}
		</div>
	);
}
