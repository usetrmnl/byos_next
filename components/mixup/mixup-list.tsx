"use client";

import { Edit, LayoutGrid, Trash2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { FormattedDate } from "@/components/ui/formatted-date";
import { getLayoutById } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Mixup } from "@/lib/types";

interface MixupListProps {
	mixups: Mixup[];
	onEditMixup?: (mixup: Mixup) => void;
	onDeleteMixup?: (mixupId: string) => void;
	isLoading?: boolean;
}

const LayoutBadge = ({ layoutId }: { layoutId: string }) => {
	const layout = getLayoutById(layoutId);
	if (!layout) return null;

	return (
		<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
			<LayoutGrid className="size-3" />
			<span className="capitalize">{layoutId.replace(/-/g, " ")}</span>
			<span className="text-muted-foreground/60">
				({layout.slots.length} slots)
			</span>
		</div>
	);
};

export function MixupList({
	mixups,
	onEditMixup,
	onDeleteMixup,
	isLoading = false,
}: MixupListProps) {
	if (mixups.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="text-muted-foreground mb-4">
					No mixups found. Create your first mixup to get started.
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{mixups.map((mixup) => {
				const layout = getLayoutById(mixup.layout_id);
				const slotCount = layout?.slots.length ?? 0;

				return (
					<div
						key={mixup.id}
						className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
					>
						<AspectRatio
							ratio={DEFAULT_IMAGE_WIDTH / DEFAULT_IMAGE_HEIGHT}
							className="bg-neutral-100 flex items-center justify-center p-0 border-b"
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
									className="object-cover w-full h-full"
									style={{ imageRendering: "pixelated" }}
								/>
							</picture>
						</AspectRatio>

						<div className="p-4 flex flex-col flex-grow">
							<h4 className="scroll-m-20 text-xl font-semibold tracking-tight group-hover:text-blue-600 transition-colors">
								{mixup.name}
							</h4>
							<p className="text-gray-600 text-sm mt-2 mb-4 flex-grow">
								{slotCount
									? `Uses a ${mixup.layout_id.replace(/-/g, " ")} layout with ${slotCount} slots.`
									: "Mixup layout details unavailable."}
							</p>

							<div className="text-xs text-gray-500 flex justify-between items-center">
								<LayoutBadge layoutId={mixup.layout_id} />
								{mixup.updated_at ? (
									<FormattedDate dateString={mixup.updated_at} />
								) : (
									<span className="text-muted-foreground">No date</span>
								)}
							</div>

							<div className="mt-4 flex gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => onEditMixup?.(mixup)}
									disabled={isLoading}
								>
									<Edit className="h-4 w-4 mr-1" />
									Edit
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="text-destructive hover:text-destructive"
									onClick={() => onDeleteMixup?.(mixup.id)}
									disabled={isLoading}
								>
									<Trash2 className="h-4 w-4 mr-1" />
									Delete
								</Button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
