"use client";

import { Edit, LayoutGrid, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FormattedDate } from "@/components/ui/formatted-date";
import { getLayoutById } from "@/lib/mixup/constants";
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
			{mixups.map((mixup) => (
				<Card key={mixup.id} className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-3">
						<div className="flex justify-between items-start">
							<div className="space-y-1">
								<CardTitle className="text-lg">{mixup.name}</CardTitle>
								<CardDescription>
									{mixup.updated_at ? (
										<FormattedDate dateString={mixup.updated_at} />
									) : (
										<span className="text-muted-foreground">No date</span>
									)}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<LayoutBadge layoutId={mixup.layout_id} />
						<div className="flex gap-2">
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
					</CardContent>
				</Card>
			))}
		</div>
	);
}
