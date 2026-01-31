"use client";

import { useMemo, useState, useTransition } from "react";
import type { CatalogEntry, TrmnlRecipe } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTemplate } from "@/components/ui/page-template";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { installCommunityRecipe } from "@/app/actions/catalog";

// --- Shared recipe card ---

interface CardProps {
	href?: string;
	name: string;
	screenshotUrl: string | null;
	fallbackImageUrl: string | null;
	author?: string;
	description?: string;
	badges: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

function RecipeCard({
	href,
	name,
	screenshotUrl,
	fallbackImageUrl,
	author,
	description,
	badges,
	action,
	className,
}: CardProps) {
	return (
		<div
			className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full ${className ?? ""}`}
		>
			<div className="aspect-video bg-muted overflow-hidden bg-neutral-100">
				{screenshotUrl ? (
					<img
						src={screenshotUrl}
						alt={`${name} screenshot`}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground">
						{fallbackImageUrl ? (
							<img
								src={fallbackImageUrl}
								alt=""
								className="w-24 h-24 object-contain opacity-50"
								loading="lazy"
							/>
						) : (
							<span className="text-3xl font-bold opacity-30">
								{name.charAt(0)}
							</span>
						)}
					</div>
				)}
			</div>
			<div className="p-4 flex flex-col flex-grow gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						<h4 className="text-base font-semibold tracking-tight truncate">
							{name}
						</h4>
						{href && (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
							>
								<ExternalLink className="w-3.5 h-3.5" />
							</a>
						)}
					</div>
					{author && (
						<p className="text-xs text-muted-foreground">by {author}</p>
					)}
				</div>

				{description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{description}
					</p>
				)}

				<div className="flex flex-wrap gap-1.5 mt-auto">{badges}</div>
				{action && <div className="mt-2">{action}</div>}
			</div>
		</div>
	);
}

function CategoryBadges({ category }: { category?: string }) {
	if (!category) return null;
	return category.split(",").map((c) => (
		<Badge key={c.trim()} variant="outline" className="text-xs">
			{c.trim().charAt(0).toUpperCase() + c.trim().slice(1)}
		</Badge>
	));
}

// --- Shared search/filter bar ---

function SearchBar({
	search,
	onSearchChange,
	count,
	extra,
}: {
	search: string;
	onSearchChange: (v: string) => void;
	count: number;
	extra?: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3">
			<Input
				placeholder="Search plugins..."
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				className="max-w-sm"
			/>
			{extra}
			<span className="text-sm text-muted-foreground">
				{count} result{count !== 1 ? "s" : ""}
			</span>
		</div>
	);
}

// --- Install button for community entries ---

function InstallButton({ entry }: { entry: CatalogEntry }) {
	const [isPending, startTransition] = useTransition();

	function handleInstall() {
		startTransition(async () => {
			const result = await installCommunityRecipe(entry);
			if (result.success) {
				toast.success(`"${entry.name}" installed successfully`);
			} else {
				toast.error(result.error ?? "Installation failed");
			}
		});
	}

	return (
		<Button
			size="sm"
			variant="outline"
			disabled={isPending}
			onClick={handleInstall}
		>
			{isPending ? "Installing…" : "Install"}
		</Button>
	);
}

// --- Tab: Community ---

function CommunityTab({ entries }: { entries: CatalogEntry[] }) {
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
		<div className="space-y-4">
			<SearchBar
				search={search}
				onSearchChange={setSearch}
				count={filtered.length}
				extra={
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
				}
			/>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filtered.map((entry, index) => {
					const byos = entry.byos?.byos_laravel;
					return (
						<RecipeCard
							key={`community-${entry.trmnlp?.id ?? index}-${entry.name}`}
							href={entry.trmnlp?.repo ?? "#"}
							name={entry.name}
							screenshotUrl={entry.screenshot_url}
							fallbackImageUrl={entry.logo_url}
							author={entry.author?.github}
							description={entry.author_bio?.description}
							className="bg-neutral-200"
							action={
								entry.trmnlp?.zip_url ? (
									<InstallButton entry={entry} />
								) : undefined
							}
							badges={
								<>
									{byos?.compatibility ? (
										<Badge
											variant="default"
											className="bg-green-600 hover:bg-green-700 text-xs"
										>
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
									<CategoryBadges category={entry.author_bio?.category} />
								</>
							}
						/>
					);
				})}
			</div>
			{filtered.length === 0 && (
				<p className="text-center text-muted-foreground py-12">
					No plugins match your search.
				</p>
			)}
		</div>
	);
}

// --- Tab: Official ---

function OfficialTab({ recipes }: { recipes: TrmnlRecipe[] }) {
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const q = search.toLowerCase();
		if (!q) return recipes;
		return recipes.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				r.author_bio?.description?.toLowerCase().includes(q) ||
				r.author_bio?.name?.toLowerCase().includes(q) ||
				r.author_bio?.category?.toLowerCase().includes(q),
		);
	}, [recipes, search]);

	return (
		<div className="space-y-4">
			<SearchBar
				search={search}
				onSearchChange={setSearch}
				count={filtered.length}
			/>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filtered.map((recipe) => (
					<RecipeCard
						key={`official-${recipe.id}`}
						href={`https://trmnl.com/recipes/${recipe.id}`}
						name={recipe.name}
						screenshotUrl={recipe.screenshot_url}
						fallbackImageUrl={recipe.icon_url}
						author={recipe.author_bio?.name}
						description={recipe.author_bio?.description}
						badges={
							<>
								<Badge variant="secondary" className="text-xs">
									{recipe.stats.installs} install
									{recipe.stats.installs !== 1 ? "s" : ""}
								</Badge>
								<Badge variant="secondary" className="text-xs">
									{recipe.stats.forks} fork{recipe.stats.forks !== 1 ? "s" : ""}
								</Badge>
								<CategoryBadges category={recipe.author_bio?.category} />
							</>
						}
					/>
				))}
			</div>
			{filtered.length === 0 && (
				<p className="text-center text-muted-foreground py-12">
					No recipes match your search.
				</p>
			)}
		</div>
	);
}

// --- Main page component ---

export function CatalogPage({
	communityEntries,
	officialEntries,
}: {
	communityEntries: CatalogEntry[];
	officialEntries: TrmnlRecipe[];
}) {
	return (
		<PageTemplate
			title="Catalog"
			subtitle="Browse TRMNL official and community recipe catalogs."
		>
			<Tabs defaultValue="official">
				<TabsList>
					<TabsTrigger value="official">
						Official ({officialEntries.length})
					</TabsTrigger>
					<TabsTrigger value="community">
						Community ({communityEntries.length})
					</TabsTrigger>
				</TabsList>
				<TabsContent value="official" className="mt-4">
					<OfficialTab recipes={officialEntries} />
				</TabsContent>
				<TabsContent value="community" className="mt-4">
					<CommunityTab entries={communityEntries} />
				</TabsContent>
			</Tabs>
		</PageTemplate>
	);
}
