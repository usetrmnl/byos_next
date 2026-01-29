"use client";

import { useMemo, useState } from "react";
import type { CatalogEntry } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageTemplate } from "@/components/ui/page-template";

function CatalogCard({ entry }: { entry: CatalogEntry }) {
	const byos = entry.byos?.byos_laravel;
	const repo = entry.trmnlp?.repo;

	return (
		<a
			href={repo ?? "#"}
			target="_blank"
			rel="noopener noreferrer"
			className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
		>
			<div className="aspect-video bg-muted overflow-hidden bg-neutral-100">
				{entry.screenshot_url ? (
					<img
						src={entry.screenshot_url}
						alt={`${entry.name} screenshot`}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground">
						{entry.logo_url ? (
							<img
								src={entry.logo_url}
								alt=""
								className="w-24 h-24 object-contain opacity-50"
								loading="lazy"
							/>
						) : (
							<span className="text-3xl font-bold opacity-30">
								{entry.name.charAt(0)}
							</span>
						)}
					</div>
				)}
			</div>
			<div className="p-4 flex flex-col flex-grow gap-3">
				<div className="min-w-0">
					<h4 className="text-base font-semibold tracking-tight group-hover:text-blue-600 transition-colors truncate">
						{entry.name}
					</h4>
					{entry.author?.github && (
						<p className="text-xs text-muted-foreground">
							by {entry.author.github}
						</p>
					)}
				</div>

				{entry.author_bio?.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{entry.author_bio.description}
					</p>
				)}

				<div className="flex flex-wrap gap-1.5 mt-auto">
					{byos?.compatibility ? (
						<Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
							BYOS
						</Badge>
					) : (
						<Badge variant="secondary" className="text-xs">
							BYOS N/A
						</Badge>
					)}
					<Badge variant="outline" className="text-xs">
						{entry.license}
					</Badge>
					{byos?.min_version && (
						<Badge variant="outline" className="text-xs">
							≥ {byos.min_version}
						</Badge>
					)}
					{entry.author_bio?.category &&
						entry.author_bio.category.split(',').map((category) => (
							<Badge key={category} variant="outline" className="text-xs">
								{category.charAt(0).toUpperCase() + category.slice(1)}
							</Badge>
						))
					}
				</div>
			</div>
		</a>
	);
}

export function CatalogGrid({ entries }: { entries: CatalogEntry[] }) {
	const [search, setSearch] = useState("");
	const [byosOnly, setByosOnly] = useState(false);

	const filtered = useMemo(() => {
		const q = search.toLowerCase();
		return entries.filter((e) => {
			if (byosOnly && !e.byos?.byos_laravel?.compatibility) return false;
			if (!q) return true;
			return (
				e.name.toLowerCase().includes(q) ||
				e.author_bio?.description?.toLowerCase().includes(q) ||
				e.author?.github?.toLowerCase().includes(q) ||
				e.author_bio?.category?.toLowerCase().includes(q)
			);
		});
	}, [entries, search, byosOnly]);

	return (
		<PageTemplate
			title="Catalog"
			subtitle={`${entries.length} community plugins from the TRMNL recipe catalog.`}
		>
			<div className="flex items-center gap-3">
				<Input
					placeholder="Search plugins..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-sm"
				/>
				<button
					type="button"
					onClick={() => setByosOnly(!byosOnly)}
					className="shrink-0"
				>
					<Badge
						variant={byosOnly ? "default" : "outline"}
						className={`cursor-pointer ${byosOnly ? "bg-green-600 hover:bg-green-700" : ""}`}
					>
						BYOS compatible only
					</Badge>
				</button>
				<span className="text-sm text-muted-foreground">
					{filtered.length} result{filtered.length !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filtered.map((entry) => (
					<CatalogCard key={entry.trmnlp?.id ?? entry.name} entry={entry} />
				))}
			</div>

			{filtered.length === 0 && (
				<p className="text-center text-muted-foreground py-12">
					No plugins match your search.
				</p>
			)}
		</PageTemplate>
	);
}
