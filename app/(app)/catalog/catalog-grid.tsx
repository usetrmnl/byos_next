"use client";

import {
	AlertCircle,
	ArrowUpRight,
	Loader2,
	RefreshCw,
	WifiOff,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	installCommunityRecipe,
	loadOfficialRecipesPage,
} from "@/app/actions/catalog";
import { PageTemplate } from "@/components/common/page-template";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	CATALOG_PAGE_SIZE,
	type CatalogEntry,
	type TrmnlRecipe,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

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
			className={cn(
				"group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
				className,
			)}
		>
			<div className="relative aspect-video overflow-hidden border-b bg-neutral-100">
				{screenshotUrl || fallbackImageUrl ? (
					<Image
						src={screenshotUrl ?? fallbackImageUrl ?? ""}
						alt={screenshotUrl ? `${name} screenshot` : ""}
						fill
						className={cn(
							"object-cover transition-transform duration-300 group-hover:scale-[1.02]",
							!screenshotUrl && "object-contain p-8 opacity-55",
						)}
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground">
						<span className="text-3xl font-bold opacity-30">
							{name.charAt(0)}
						</span>
					</div>
				)}
			</div>
			<div className="p-4 flex flex-col flex-grow gap-3">
				<div className="min-w-0">
					<div className="flex items-start justify-between gap-2">
						<h4 className="text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
							{name}
						</h4>
						{href && (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`Open ${name}`}
								className="mt-0.5 shrink-0 text-muted-foreground transition-all hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
							>
								<ArrowUpRight className="w-4 h-4" />
							</a>
						)}
					</div>
					{author && (
						<p className="mt-0.5 text-xs text-muted-foreground">by {author}</p>
					)}
				</div>

				{description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{description}
					</p>
				)}

				<div className="flex flex-wrap gap-1.5 mt-auto pt-1">{badges}</div>
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
	placeholder = "Search catalog...",
}: {
	search: string;
	onSearchChange: (v: string) => void;
	count: number;
	extra?: React.ReactNode;
	placeholder?: string;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
			<Input
				placeholder={placeholder}
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				className="h-9 max-w-sm bg-background"
			/>
			<div className="flex flex-wrap items-center gap-2">
				{extra}
				<span className="rounded-full border px-2 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
					{count} result{count !== 1 ? "s" : ""}
				</span>
			</div>
		</div>
	);
}

function SourceNotice({
	error,
	source,
}: {
	error: string | null;
	source: string;
}) {
	if (!error) return null;

	return (
		<Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
			<WifiOff className="h-4 w-4" />
			<AlertTitle>{source} is unavailable</AlertTitle>
			<AlertDescription>
				<p>{error}</p>
				<p className="text-xs">
					The rest of the catalog still works. Try again later or load another
					source.
				</p>
			</AlertDescription>
		</Alert>
	);
}

function EmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
			<AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
			<p className="font-medium">{title}</p>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function AutoLoadMore({
	disabled,
	hasMore,
	isLoading,
	onLoad,
}: {
	disabled?: boolean;
	hasMore: boolean;
	isLoading?: boolean;
	onLoad: () => void;
}) {
	const markerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!hasMore || disabled) return;
		const marker = markerRef.current;
		if (!marker) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) onLoad();
			},
			{ rootMargin: "320px 0px" },
		);

		observer.observe(marker);
		return () => observer.disconnect();
	}, [disabled, hasMore, onLoad]);

	if (!hasMore) return null;

	return (
		<div
			ref={markerRef}
			className="flex min-h-12 items-center justify-center pt-2 text-xs text-muted-foreground"
		>
			{isLoading ? (
				<span className="inline-flex items-center gap-2">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					Loading 10 more...
				</span>
			) : (
				<span>More items load as you scroll</span>
			)}
		</div>
	);
}

function useVisibleCount() {
	const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);

	return {
		visibleCount,
		resetVisibleCount: () => setVisibleCount(CATALOG_PAGE_SIZE),
		showAll: (count: number) => setVisibleCount(count),
		showMore: () => setVisibleCount((count) => count + CATALOG_PAGE_SIZE),
	};
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

function CommunityTab({
	entries,
	error,
}: {
	entries: CatalogEntry[];
	error: string | null;
}) {
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
	const { visibleCount, resetVisibleCount, showAll, showMore } =
		useVisibleCount();
	const visibleEntries = filtered.slice(0, visibleCount);
	const hasMore = visibleCount < filtered.length;

	return (
		<div className="space-y-4">
			<SourceNotice error={error} source="Community catalog" />
			<SearchBar
				search={search}
				onSearchChange={(value) => {
					setSearch(value);
					resetVisibleCount();
				}}
				count={filtered.length}
				placeholder="Search community plugins..."
				extra={
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!hasMore}
							onClick={() => showAll(filtered.length)}
						>
							Load all
						</Button>
						<button
							type="button"
							onClick={() => {
								setByosOnly(!byosOnly);
								resetVisibleCount();
							}}
							className="shrink-0"
						>
							<Badge
								variant={byosOnly ? "default" : "outline"}
								className={`cursor-pointer ${byosOnly ? "bg-green-600 hover:bg-green-700" : ""}`}
							>
								BYOS compatible only
							</Badge>
						</button>
					</>
				}
			/>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				{visibleEntries.map((entry, index) => {
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
			<AutoLoadMore hasMore={hasMore} onLoad={showMore} />
			{filtered.length === 0 && (
				<EmptyState
					title={error ? "Community catalog is offline" : "No plugins found"}
					description={
						error
							? "The community source did not load, but the official TRMNL catalog may still be available."
							: "No community plugins match your current filters."
					}
				/>
			)}
		</div>
	);
}

// --- Tab: Official ---

function OfficialTab({
	recipes: initialRecipes,
	error,
	initialNextPage,
	total,
}: {
	recipes: TrmnlRecipe[];
	error: string | null;
	initialNextPage: number | null;
	total: number | null;
}) {
	const [search, setSearch] = useState("");
	const [recipes, setRecipes] = useState(initialRecipes);
	const [nextPage, setNextPage] = useState(initialNextPage);
	const [sourceError, setSourceError] = useState(error);
	const [isLoadingPage, setIsLoadingPage] = useState(false);
	const [isLoadingAll, setIsLoadingAll] = useState(false);

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
	const { visibleCount, resetVisibleCount, showAll, showMore } =
		useVisibleCount();
	const visibleRecipes = filtered.slice(0, visibleCount);
	const hasHiddenLoaded = visibleCount < filtered.length;
	const canLoadRemote = nextPage !== null;
	const hasMore = hasHiddenLoaded || canLoadRemote;

	function mergeRecipes(nextRecipes: TrmnlRecipe[]) {
		setRecipes((current) => {
			const seen = new Set(current.map((recipe) => recipe.id));
			const fresh = nextRecipes.filter((recipe) => {
				if (seen.has(recipe.id)) return false;
				seen.add(recipe.id);
				return true;
			});
			return [...current, ...fresh];
		});
	}

	function loadPage(pageToLoad: number, revealAfterLoad: boolean) {
		if (isLoadingPage || isLoadingAll) return;

		setIsLoadingPage(true);
		void (async () => {
			try {
				const result = await loadOfficialRecipesPage(pageToLoad);
				if (result.error) {
					setSourceError(result.error);
					toast.error("TRMNL catalog is unavailable", {
						description: result.error,
					});
					return;
				}

				setSourceError(null);
				setNextPage(result.nextPage);
				mergeRecipes(result.recipes);
				if (revealAfterLoad) showMore();
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "TRMNL recipes are unavailable right now.";
				setSourceError(message);
				toast.error("TRMNL catalog is unavailable", {
					description: message,
				});
			} finally {
				setIsLoadingPage(false);
			}
		})();
	}

	function handleRetry() {
		loadPage(1, false);
	}

	function handleLoadMore() {
		if (isLoadingAll) return;

		if (hasHiddenLoaded) {
			showMore();
			return;
		}

		if (nextPage) loadPage(nextPage, true);
	}

	async function loadRemainingOfficialRecipes() {
		if (!nextPage) return recipes;

		let pageToLoad: number | null = nextPage;
		const loaded: TrmnlRecipe[] = [];

		while (pageToLoad) {
			const result = await loadOfficialRecipesPage(pageToLoad);
			if (result.error) {
				throw new Error(result.error);
			}
			loaded.push(...result.recipes);
			pageToLoad = result.nextPage;
		}

		setNextPage(null);
		const seen = new Set(recipes.map((recipe) => recipe.id));
		const fresh = loaded.filter((recipe) => {
			if (seen.has(recipe.id)) return false;
			seen.add(recipe.id);
			return true;
		});
		const allRecipes = [...recipes, ...fresh];
		setRecipes(allRecipes);
		return allRecipes;
	}

	function handleLoadAll() {
		if (isLoadingPage || isLoadingAll) return;

		setIsLoadingAll(true);
		void (async () => {
			try {
				const allRecipes = await loadRemainingOfficialRecipes();
				setSourceError(null);
				showAll(allRecipes.length);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "TRMNL recipes are unavailable right now.";
				setSourceError(message);
				toast.error("TRMNL catalog is unavailable", {
					description: message,
				});
			} finally {
				setIsLoadingAll(false);
			}
		})();
	}

	return (
		<div className="space-y-4">
			<SourceNotice error={sourceError} source="TRMNL recipes" />
			<SearchBar
				search={search}
				onSearchChange={(value) => {
					setSearch(value);
					resetVisibleCount();
				}}
				count={filtered.length}
				placeholder="Search official recipes..."
				extra={
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!hasMore || isLoadingPage || isLoadingAll}
							onClick={handleLoadAll}
						>
							{isLoadingAll ? (
								<>
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
									Loading all...
								</>
							) : (
								"Load all"
							)}
						</Button>
						{total ? (
							<span className="rounded-full border px-2 py-1 text-[11px] font-medium tabular-nums text-muted-foreground">
								{recipes.length} / {total} loaded
							</span>
						) : undefined}
					</>
				}
			/>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				{visibleRecipes.map((recipe) => (
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
			<AutoLoadMore
				disabled={isLoadingPage || isLoadingAll}
				hasMore={hasMore}
				isLoading={isLoadingPage || isLoadingAll}
				onLoad={handleLoadMore}
			/>
			{filtered.length === 0 && (
				<div className="space-y-3">
					<EmptyState
						title={sourceError ? "TRMNL is unreachable" : "No recipes found"}
						description={
							sourceError
								? "The official catalog did not load. Community plugins remain available if that source is online."
								: canLoadRemote
									? "No loaded recipes match your search yet. Load more to search the next batch."
									: "No official recipes match your search."
						}
					/>
					{sourceError && recipes.length === 0 && (
						<div className="flex justify-center">
							<Button
								type="button"
								variant="outline"
								onClick={handleRetry}
								disabled={isLoadingPage}
							>
								<RefreshCw className="mr-2 h-3.5 w-3.5" />
								Try TRMNL again
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// --- Main page component ---

export function CatalogPage({
	communityEntries,
	communityError,
	externalCatalogEnabled,
	officialEntries,
	officialError,
	officialNextPage,
	officialTotal,
}: {
	communityEntries: CatalogEntry[];
	communityError: string | null;
	externalCatalogEnabled: boolean;
	officialEntries: TrmnlRecipe[];
	officialError: string | null;
	officialNextPage: number | null;
	officialTotal: number | null;
}) {
	const officialCount = officialTotal ?? officialEntries.length;

	return (
		<PageTemplate
			title="Catalog"
			subtitle={
				<div className="space-y-2">
					<p>Browse official TRMNL recipes and community plugins.</p>
					{!externalCatalogEnabled && (
						<p className="text-sm">
							Set{" "}
							<code className="font-mono">ENABLE_EXTERNAL_CATALOG=true</code> to
							allow this server to reach external catalog sources.
						</p>
					)}
				</div>
			}
		>
			<Tabs defaultValue="official" className="gap-4">
				<TabsList className="w-full justify-start sm:w-fit">
					<TabsTrigger value="official">
						Official
						<span className="ml-1 rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular-nums">
							{officialCount}
						</span>
					</TabsTrigger>
					<TabsTrigger value="community">
						Community
						<span className="ml-1 rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular-nums">
							{communityEntries.length}
						</span>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="official" className="mt-4">
					<OfficialTab
						recipes={officialEntries}
						error={officialError}
						initialNextPage={officialNextPage}
						total={officialTotal}
					/>
				</TabsContent>
				<TabsContent value="community" className="mt-4">
					<CommunityTab entries={communityEntries} error={communityError} />
				</TabsContent>
			</Tabs>
		</PageTemplate>
	);
}
