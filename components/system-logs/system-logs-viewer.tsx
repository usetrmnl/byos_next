"use client";

import { ChevronDown, ChevronUp, Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSystemLogs } from "@/app/actions/system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchWithDebounce } from "@/hooks/useSearchWithDebounce";
import type { SystemLog } from "@/lib/types";
import { formatDate } from "@/utils/helpers";

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
	const scrollRef = useRef<HTMLDivElement>(null);
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

	// Maintain scroll position
	useEffect(() => {
		if (scrollRef.current && !isLoading) {
			scrollRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [isLoading]);

	// Calculate pagination values
	const totalPages = Math.ceil(totalLogs / perPage);
	const showingFrom = (page - 1) * perPage + 1;
	const showingTo = Math.min(page * perPage, totalLogs);

	// Check if any filters are active
	const hasActiveFilters =
		searchQuery || levelFilter !== "all" || sourceFilter !== "all";

	// Generate page numbers for pagination
	const getPageNumbers = () => {
		const pages: (number | "ellipsis")[] = [];
		if (totalPages <= 5) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else if (page <= 3) {
			for (let i = 1; i <= Math.min(5, totalPages); i++) pages.push(i);
			if (totalPages > 5) {
				pages.push("ellipsis");
				pages.push(totalPages);
			}
		} else if (page >= totalPages - 2) {
			pages.push(1);
			pages.push("ellipsis");
			for (let i = totalPages - 4; i <= totalPages; i++) {
				if (i > 1) pages.push(i);
			}
		} else {
			pages.push(1);
			pages.push("ellipsis");
			for (let i = page - 1; i <= page + 1; i++) pages.push(i);
			pages.push("ellipsis");
			pages.push(totalPages);
		}
		return pages;
	};

	return (
		<div ref={scrollRef} className="space-y-4">
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

			{/* Logs table */}
			<Card className="overflow-hidden p-0">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="px-4 py-3">Time</TableHead>
							<TableHead className="px-4 py-3">Level</TableHead>
							<TableHead className="px-4 py-3">Source</TableHead>
							<TableHead className="px-4 py-3">Message</TableHead>
							<TableHead className="px-4 py-3">Metadata</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell className="px-4 py-3">
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell className="px-4 py-3">
										<Skeleton className="h-4 w-16" />
									</TableCell>
									<TableCell className="px-4 py-3">
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell className="px-4 py-3">
										<Skeleton className="h-4 w-full" />
									</TableCell>
									<TableCell className="px-4 py-3">
										<Skeleton className="h-4 w-20" />
									</TableCell>
								</TableRow>
							))
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="px-4 py-8 text-center text-muted-foreground"
								>
									No logs found matching your criteria
								</TableCell>
							</TableRow>
						) : (
							logs.map((log, index) => {
								const prevLog = index > 0 ? logs[index - 1] : null;
								// Check if we should show time based on time difference with previous log
								const shouldTimeBeShown =
									index === 0 ||
									(prevLog &&
										Math.abs(
											new Date(log.created_at || "").getTime() -
												new Date(prevLog.created_at || "").getTime(),
										) /
											1000 >=
											3);
								// Check if we should show level based on level difference with previous log or time difference
								const shouldLevelBeShown =
									index === 0 ||
									(prevLog && prevLog.level !== log.level) ||
									(prevLog &&
										Math.abs(
											new Date(log.created_at || "").getTime() -
												new Date(prevLog.created_at || "").getTime(),
										) /
											1000 >=
											3);

								return (
									<TableRow key={log.id}>
										<TableCell className="px-4 py-3 text-sm">
											{shouldTimeBeShown ? formatDate(log.created_at) : ""}
										</TableCell>
										<TableCell className="px-4 py-3">
											{shouldLevelBeShown ? (
												<Badge
													variant="outline"
													className={`
                                        ${log.level === "error" ? "bg-red-100 text-red-800 border-red-200" : ""}
                                        ${log.level === "warning" ? "bg-amber-100 text-amber-800 border-amber-200" : ""}
                                        ${log.level === "info" ? "bg-blue-100 text-blue-800 border-blue-200" : ""}
                                        ${log.level === "debug" ? "bg-gray-100 text-gray-800 border-gray-200" : ""}
                                        `}
												>
													{log.level}
												</Badge>
											) : (
												""
											)}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm max-w-[120px] truncate">
											{log.source}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm max-w-[200px] md:max-w-[250px] lg:max-w-[300px] truncate">
											{log.message}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											{log.metadata ? (
												<div className="flex items-start gap-1 justify-between">
													<div className="font-mono text-xs w-full max-w-[120px] md:max-w-[200px] lg:max-w-[400px]">
														{expandedLogs[log.id] ? (
															<div className="pt-2 h-[200px] w-full overflow-auto">
																<pre className="whitespace-pre-wrap break-words">
																	{JSON.stringify(
																		JSON.parse(log.metadata),
																		null,
																		2,
																	)}
																</pre>
															</div>
														) : (
															<div className="pt-2 h-8 truncate">
																{log.metadata}
															</div>
														)}
													</div>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => toggleExpanded(log.id)}
														aria-label={
															expandedLogs[log.id]
																? "Collapse details"
																: "Expand details"
														}
														className="bg-transparent"
													>
														{expandedLogs[log.id] ? (
															<ChevronUp className="h-4 w-4" />
														) : (
															<ChevronDown className="h-4 w-4" />
														)}
													</Button>
												</div>
											) : (
												<span className="text-muted-foreground"> - </span>
											)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</Card>

			{/* Pagination */}
			{!isLoading && logs.length > 0 && (
				<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
					<div className="text-sm text-muted-foreground">
						Showing <span className="font-medium">{showingFrom}</span> to{" "}
						<span className="font-medium">{showingTo}</span> of{" "}
						<span className="font-medium">{totalLogs}</span> logs
					</div>

					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => page > 1 && handlePageChange(page - 1)}
									className={
										page <= 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>

							{getPageNumbers().map((pageNum, i) =>
								pageNum === "ellipsis" ? (
									<PaginationItem key={`ellipsis-${i}`}>
										<PaginationEllipsis />
									</PaginationItem>
								) : (
									<PaginationItem key={pageNum}>
										<PaginationLink
											isActive={page === pageNum}
											onClick={() => handlePageChange(pageNum)}
											className="cursor-pointer"
										>
											{pageNum}
										</PaginationLink>
									</PaginationItem>
								),
							)}

							<PaginationItem>
								<PaginationNext
									onClick={() =>
										page < totalPages && handlePageChange(page + 1)
									}
									className={
										page >= totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}
