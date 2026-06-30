"use client";

import { Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSystemLogs } from "@/app/actions/system";
import { LogPagination } from "@/components/common/log-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchWithDebounce } from "@/hooks/useSearchWithDebounce";
import type { SystemLog } from "@/lib/types";
import { SystemLogsList } from "./system-logs-list";

const DEFAULT_ITEMS_PER_PAGE = 100;

// Define the type for the fetch function parameters
export type SystemLogsFetchParams = {
	page: number;
	perPage: number;
	search?: string;
	level?: string;
	source?: string;
};

// Define the type for the fetch function result
export type SystemLogsFetchResult = {
	logs: SystemLog[];
	total: number;
	uniqueSources: string[];
};

interface SystemLogsViewerProps {
	customFetchFunction?: (
		params: SystemLogsFetchParams,
	) => Promise<SystemLogsFetchResult>;
	paramPrefix?: string;
	perPage?: number;
	initialData?: {
		logs: SystemLog[];
		total: number;
		uniqueSources: string[];
	};
}

export default function SystemLogsViewer({
	customFetchFunction,
	paramPrefix = "",
	perPage = DEFAULT_ITEMS_PER_PAGE,
	initialData,
}: SystemLogsViewerProps) {
	const router = useRouter();
	const pathname = usePathname() ?? "/";
	const searchParams = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Get URL params with defaults
	const page = Number(searchParams?.get(`${paramPrefix}page`) || "1");
	const searchQuery = searchParams?.get(`${paramPrefix}search`) || "";
	const levelFilter = searchParams?.get(`${paramPrefix}level`) || "all";
	const sourceFilter = searchParams?.get(`${paramPrefix}source`) || "all";

	// State
	const [logs, setLogs] = useState<SystemLog[]>(initialData?.logs || []);
	const [totalLogs, setTotalLogs] = useState(initialData?.total || 0);
	const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
	const [isLoading, setIsLoading] = useState(!initialData);
	const [sources, setSources] = useState<string[]>(
		initialData?.uniqueSources || [],
	);
	const [activeTab, setActiveTab] = useState<string>("all");

	// Create a memoized function to update URL params
	const createQueryString = useCallback(
		(params: Record<string, string | number | null>) => {
			const newSearchParams = new URLSearchParams(searchParams?.toString());

			// Add prefix to all parameters
			for (const [key, value] of Object.entries(params)) {
				const prefixedKey = `${paramPrefix}${key}`;

				if (value === null) {
					newSearchParams.delete(prefixedKey);
				} else {
					newSearchParams.set(prefixedKey, String(value));
				}
			}

			return newSearchParams.toString();
		},
		[searchParams, paramPrefix],
	);

	// Use the custom hook for debounced search
	const debouncedSearch = useSearchWithDebounce(
		searchQuery,
		page,
		createQueryString,
		pathname,
		router,
	);

	// Handle search input change
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		debouncedSearch(e.target.value);
	};

	// Handle level filter change
	const handleLevelChange = (value: string) => {
		const queryString = createQueryString({
			level: value === "all" ? null : value,
			page: 1, // Reset to page 1 on filter change
		});
		router.push(`${pathname}?${queryString}`, { scroll: false });
	};

	// Handle source filter change
	const handleSourceChange = (value: string) => {
		const queryString = createQueryString({
			source: value === "all" ? null : value,
			page: 1, // Reset to page 1 on filter change
		});
		router.push(`${pathname}?${queryString}`, { scroll: false });
	};

	// Handle pagination
	const handlePageChange = (newPage: number) => {
		const queryString = createQueryString({ page: newPage });
		router.push(`${pathname}?${queryString}`, { scroll: false });
	};

	// Toggle expanded state for a log
	const toggleExpanded = (id: string) => {
		setExpandedLogs((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	// Clear all filters
	const clearFilters = () => {
		router.push(pathname, { scroll: false });
		if (searchInputRef.current) {
			searchInputRef.current.value = "";
		}
	};

	// Fetch logs data
	useEffect(() => {
		// Skip initial fetch if we have initialData and no filters are applied
		if (
			initialData &&
			page === 1 &&
			!searchQuery &&
			levelFilter === "all" &&
			sourceFilter === "all"
		) {
			return;
		}

		const loadLogs = async () => {
			setIsLoading(true);
			try {
				const fetchParams = {
					page,
					perPage: perPage,
					search: searchQuery,
					level: levelFilter !== "all" ? levelFilter : undefined,
					source: sourceFilter !== "all" ? sourceFilter : undefined,
				};

				// Use the custom fetch function if provided, otherwise use the default
				const { logs, total, uniqueSources } = customFetchFunction
					? await customFetchFunction(fetchParams)
					: await fetchSystemLogs(fetchParams);

				setLogs(logs);
				setTotalLogs(total);
				setSources(uniqueSources);

				// Set active tab based on level filter
				setActiveTab(levelFilter !== "all" ? levelFilter : "all");
			} catch (error) {
				console.error("Failed to fetch logs:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadLogs();
	}, [
		page,
		searchQuery,
		levelFilter,
		sourceFilter,
		customFetchFunction,
		initialData,
		perPage,
	]);

	// Check if any filters are active
	const hasActiveFilters =
		searchQuery || levelFilter !== "all" || sourceFilter !== "all";

	return (
		<div className="space-y-4">
			{/* Search and filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						placeholder="Search logs by message or metadata..."
						defaultValue={searchQuery}
						onChange={handleSearchChange}
						className="pl-9"
						suppressHydrationWarning
					/>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Select value={sourceFilter} onValueChange={handleSourceChange}>
						<SelectTrigger className="w-[100px]">
							<SelectValue placeholder="Filter by source" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Sources</SelectItem>
							{sources.map((source) => (
								<SelectItem key={source} value={source}>
									{source}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{hasActiveFilters && (
						<Button
							variant="outline"
							size="sm"
							onClick={clearFilters}
							className="h-10"
						>
							<X className="mr-2 h-4 w-4" />
							Clear Filters
						</Button>
					)}
				</div>
			</div>

			{/* Active filters display */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-muted-foreground flex items-center">
						<Filter className="mr-1 h-3 w-3" /> Active filters:
					</span>

					{searchQuery && (
						<Badge variant="secondary" className="text-xs">
							Search: {searchQuery}
						</Badge>
					)}

					{levelFilter !== "all" && (
						<Badge variant="secondary" className="text-xs">
							Level: {levelFilter}
						</Badge>
					)}

					{sourceFilter !== "all" && (
						<Badge variant="secondary" className="text-xs">
							Source: {sourceFilter}
						</Badge>
					)}
				</div>
			)}

			{/* Tabs for log levels */}
			<Tabs
				value={activeTab}
				onValueChange={(value) => handleLevelChange(value)}
			>
				<TabsList className="grid grid-cols-5">
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="error" className="text-red-500">
						Error
					</TabsTrigger>
					<TabsTrigger value="warning" className="text-amber-500">
						Warning
					</TabsTrigger>
					<TabsTrigger value="info" className="text-primary">
						Info
					</TabsTrigger>
					<TabsTrigger value="debug" className="text-gray-500">
						Debug
					</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Logs */}
			<Card className="overflow-hidden p-0">
				{isLoading ? (
					<SystemLogsLoadingRows />
				) : (
					<SystemLogsList
						logs={logs}
						emptyLabel="No logs found matching your criteria"
						metadataMode="button"
						expandedLogs={expandedLogs}
						onToggleExpanded={toggleExpanded}
					/>
				)}
			</Card>

			{/* Pagination */}
			{!isLoading && logs.length > 0 && (
				<LogPagination
					page={page}
					perPage={perPage}
					totalItems={totalLogs}
					onPageChange={handlePageChange}
				/>
			)}
		</div>
	);
}

function SystemLogsLoadingRows() {
	return (
		<div className="divide-y">
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className="grid gap-3 px-4 py-3 md:grid-cols-[90px_80px_120px_1fr_180px]"
				>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-20" />
				</div>
			))}
		</div>
	);
}
