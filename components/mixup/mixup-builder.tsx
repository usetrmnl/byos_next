"use client";

import { LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MixupRecipe = {
	slug: string;
	title: string;
	description?: string;
	tags?: string[];
};

type LayoutSlot = {
	id: string;
	label: string;
	rowSpan?: number;
	colSpan?: number;
	hint?: string;
};

type LayoutOption = {
	id: string;
	slots: LayoutSlot[];
};

const SLOT_GRADIENTS = [
	"from-sky-500/70 via-cyan-400/50 to-blue-500/30",
	"from-fuchsia-500/60 via-purple-500/40 to-indigo-500/30",
	"from-amber-500/70 via-orange-400/50 to-yellow-400/30",
	"from-emerald-500/70 via-lime-400/60 to-green-400/30",
];

const LAYOUT_OPTIONS: LayoutOption[] = [
	{
		id: "quarters",
		slots: [
			{ id: "top-left", label: "Top left" },
			{ id: "top-right", label: "Top right" },
			{ id: "bottom-left", label: "Bottom left" },
			{ id: "bottom-right", label: "Bottom right" },
		],
	},
	{
		id: "top-banner",
		slots: [
			{ id: "top", label: "Top span", colSpan: 2, hint: "2 quarters" },
			{ id: "bottom-left", label: "Bottom left" },
			{ id: "bottom-right", label: "Bottom right" },
		],
	},
	{
		id: "left-rail",
		slots: [
			{ id: "left", label: "Left column", rowSpan: 2, hint: "2 quarters" },
			{ id: "top-right", label: "Top right" },
			{ id: "bottom-right", label: "Bottom right" },
		],
	},
	{
		id: "vertical-halves",
		slots: [
			{ id: "left-half", label: "Left half", rowSpan: 2, hint: "2 quarters" },
			{
				id: "right-half",
				label: "Right half",
				rowSpan: 2,
				hint: "2 quarters",
			},
		],
	},
	{
		id: "horizontal-halves",
		slots: [
			{ id: "top-half", label: "Top half", colSpan: 2, hint: "2 quarters" },
			{
				id: "bottom-half",
				label: "Bottom half",
				colSpan: 2,
				hint: "2 quarters",
			},
		],
	},
];

const LayoutPreview = ({
	layout,
}: {
	layout: LayoutOption;
}) => {
	return (
		<div className="aspect-square w-full max-w-[48px] overflow-hidden rounded-xs border bg-muted/30 p-0.5 shadow-xs">
			<div
				className="grid h-full w-full gap-0.5"
				style={{
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gridTemplateRows: "repeat(2, minmax(0, 1fr))",
				}}
			>
				{layout.slots.map((slot, index) => (
					<div
						key={slot.id}
						style={{
							gridColumn: `span ${slot.colSpan ?? 1}`,
							gridRow: `span ${slot.rowSpan ?? 1}`,
						}}
						className={cn(
							"rounded-[2px] border border-border/80 bg-foreground/[0.08]",
							index === 0 && "opacity-90",
						)}
					/>
				))}
			</div>
		</div>
	);
};

const spanLabel = (slot: LayoutSlot) => {
	const spanSize = (slot.colSpan ?? 1) * (slot.rowSpan ?? 1);
	return spanSize > 1 ? `${spanSize} quarters` : "1 quarter";
};

const buildAssignments = (
	layout: LayoutOption,
	recipes: MixupRecipe[],
	existing?: Record<string, string>,
) => {
	const next: Record<string, string> = {};
	layout.slots.forEach((slot, index) => {
		const inherited = existing?.[slot.id];
		const fallback = recipes[index]?.slug;
		if (inherited) {
			next[slot.id] = inherited;
		} else if (fallback) {
			next[slot.id] = fallback;
		}
	});
	return next;
};

export function MixupBuilder({ recipes }: { recipes: MixupRecipe[] }) {
	const recipeMap = useMemo(
		() =>
			recipes.reduce<Record<string, MixupRecipe>>((acc, recipe) => {
				acc[recipe.slug] = recipe;
				return acc;
			}, {}),
		[recipes],
	);

	const [layoutId, setLayoutId] = useState(LAYOUT_OPTIONS[0].id);
	const [assignments, setAssignments] = useState<Record<string, string>>(() =>
		buildAssignments(LAYOUT_OPTIONS[0], recipes),
	);

	const currentLayout =
		LAYOUT_OPTIONS.find((option) => option.id === layoutId) ??
		LAYOUT_OPTIONS[0];

	const handleLayoutChange = (id: string) => {
		const nextLayout =
			LAYOUT_OPTIONS.find((option) => option.id === id) ?? currentLayout;
		setLayoutId(nextLayout.id);
		setAssignments((prev) => buildAssignments(nextLayout, recipes, prev));
	};

	const handleRecipeChange = (slotId: string, slug: string | null) => {
		setAssignments((prev) => {
			const next = { ...prev };
			if (slug) {
				next[slotId] = slug;
			} else {
				delete next[slotId];
			}
			return next;
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<div className="flex gap-2 overflow-x-auto pb-1">
					{LAYOUT_OPTIONS.map((option) => {
						const isActive = option.id === currentLayout.id;
						return (
							<button
								key={option.id}
								type="button"
								onClick={() => handleLayoutChange(option.id)}
								className={cn(
									"relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xs border transition-all",
									isActive ? "border-primary shadow-xs" : "border-border",
								)}
							>
								<LayoutPreview layout={option} />
							</button>
						);
					})}
				</div>
			</div>

			<Card>
				<CardContent className="space-y-4 p-3 md:p-4 lg:p-6">
					<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
						<LayoutGrid className="size-4 text-primary" />
						<span>Live preview</span>
						<span className="text-xs">Click a slot to swap its recipe</span>
					</div>
					<AspectRatio
						ratio={5 / 3}
						className="overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100 p-3 shadow-md dark:from-slate-900 dark:to-slate-900/40"
					>
						<div
							className="grid h-full w-full gap-2"
							style={{
								gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
								gridTemplateRows: "repeat(2, minmax(0, 1fr))",
							}}
						>
							{currentLayout.slots.map((slot, index) => {
								const selectedSlug = assignments[slot.id];
								const recipe = selectedSlug ? recipeMap[selectedSlug] : undefined;
								const gradient = SLOT_GRADIENTS[index % SLOT_GRADIENTS.length];

								return (
									<div
										key={slot.id}
										style={{
											gridColumn: `span ${slot.colSpan ?? 1}`,
											gridRow: `span ${slot.rowSpan ?? 1}`,
										}}
										className={cn(
											"relative overflow-hidden rounded-lg border shadow-sm bg-muted/40",
											!recipe && "border-dashed",
										)}
									>
										<div className="absolute inset-0">
											{recipe ? (
												<picture>
													<source
														srcSet={`/api/bitmap/${recipe.slug}.bmp`}
														type="image/bmp"
													/>
													<img
														src={`/api/bitmap/${recipe.slug}.bmp`}
														alt={`${recipe.title} preview`}
														className="h-full w-full object-cover"
														style={{ imageRendering: "pixelated" }}
													/>
												</picture>
											) : (
												<div
													className={cn(
														"absolute inset-0 bg-gradient-to-br opacity-70",
														gradient,
													)}
												/>
											)}
											<div className="absolute inset-0 bg-black/15" />
										</div>

										<div className="absolute right-2 top-2 z-10">
											<Select
												value={selectedSlug ?? "none"}
												onValueChange={(value) =>
													handleRecipeChange(
														slot.id,
														value === "none" ? null : value,
													)
												}
											>
												<SelectTrigger className="h-8 min-w-[110px] rounded-md border bg-background/80 text-xs shadow-sm backdrop-blur focus:ring-0 focus:ring-offset-0">
													<SelectValue placeholder="Choose recipe" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">No recipe</SelectItem>
													{recipes.map((recipeOption) => (
														<SelectItem
															key={recipeOption.slug}
															value={recipeOption.slug}
														>
															{recipeOption.title}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<div className="relative flex h-full flex-col justify-between p-3 pr-24 text-white drop-shadow">
											<div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
												<span className="font-semibold">{slot.label}</span>
												<span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px]">
													{spanLabel(slot)}
												</span>
											</div>
											<div className="space-y-1">
												<p className="text-lg font-semibold leading-tight">
													{recipe ? recipe.title : "Pick a recipe"}
												</p>
												<p className="text-xs text-white/85">
													{recipe
														? (recipe.tags || []).slice(0, 3).join(" / ") ||
															recipe.slug
														: "Unassigned slot"}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</AspectRatio>
				</CardContent>
			</Card>
		</div>
	);
}
