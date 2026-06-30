"use client";

import { Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDeviceLogsWithFilters } from "@/app/actions/device";
import { LogPagination } from "@/components/common/log-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { Log } from "@/lib/types";
import { formatDate, getLogType } from "@/utils/helpers";
import { DeviceLogEntries } from "./device-log-entry";

const ITEMS_PER_PAGE = 15;

interface DeviceLogsViewerProps {
	friendlyId?: string;
	paramPrefix?: string;
}

export default function DeviceLogsViewer({
	friendlyId,
	paramPrefix = "",
}: DeviceLogsViewerProps) {
	const router = useRouter();
	const pathname = usePathname() ?? "/";
	const searchParams = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Get URL params with defaults
	const page = Number(searchParams?.get(`${paramPrefix}page`) || "1");
	const searchQuery = searchParams?.get(`${paramPrefix}search`) || "";
	const typeFilter = searchParams?.get(`${paramPrefix}type`) || "all";

	// State
	const [logs, setLogs] = useState<(Log & { type?: string })[]>([]);
	const [totalLogs, setTotalLogs] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [logTypes, setLogTypes] = useState<string[]>([]);
	const [activeTab, setActiveTab] = useState<string>("all");

	// Create a memoized function to update URL params
	const createQueryString = useCallback(
		(params: Record<string, string | number | null>) => {
			const newSearchParams = new URLSearchParams(searchParams?.toString());

			// Preserve the activeTab parameter
			const activeTab = newSearchParams.get("activeTab");

			// Add prefix to all parameters except activeTab
			for (const [key, value] of Object.entries(params)) {
				const prefixedKey = key === "activeTab" ? key : `${paramPrefix}${key}`;

				if (value === null) {
					newSearchParams.delete(prefixedKey);
				} else {
					newSearchParams.set(prefixedKey, String(value));
				}
			}

			// Ensure activeTab is preserved
			if (activeTab) {
				newSearchParams.set("activeTab", activeTab);
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

	// Handle type filter change
	const handleTypeChange = (value: string) => {
		const queryString = createQueryString({
			type: value === "all" ? null : value,
			page: 1, // Reset to page 1 on filter change
		});
		router.push(`${pathname}?${queryString}`, { scroll: false });
	};

	// Handle pagination
	const handlePageChange = (newPage: number) => {
		const queryString = createQueryString({ page: newPage });
		router.push(`${pathname}?${queryString}`, { scroll: false });
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
		const loadLogs = async () => {
			setIsLoading(true);
			try {
				const { logs, total, uniqueTypes } = await fetchDeviceLogsWithFilters({
					page,
					perPage: ITEMS_PER_PAGE,
					search: searchQuery,
					type: typeFilter,
					friendlyId,
				});

				setLogs(logs);
				setTotalLogs(total);
				setLogTypes(uniqueTypes);

				// Set active tab based on type filter
				setActiveTab(typeFilter !== "all" ? typeFilter : "all");
			} catch (error) {
				console.error("Failed to fetch logs:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadLogs();
	}, [page, searchQuery, typeFilter, friendlyId]);

	// Check if any filters are active
	const hasActiveFilters = searchQuery || typeFilter !== "all";

	// Get log type color class
	const getLogTypeColorClass = (type: string | undefined) => {
		switch (type) {
			case "error":
				return "bg-red-100 text-red-800 border-red-200";
			case "warning":
				return "bg-amber-100 text-amber-800 border-amber-200";
			default:
				return "bg-blue-100 text-blue-800 border-blue-200";
		}
	};

	const getGridColsClass = (count: number) => {
		const gridColsMap: Record<number, string> = {
			1: "grid-cols-1",
			2: "grid-cols-2",
			3: "grid-cols-3",
			4: "grid-cols-4",
			5: "grid-cols-5",
			6: "grid-cols-6",
			7: "grid-cols-7",
			8: "grid-cols-8",
			9: "grid-cols-9",
			10: "grid-cols-10",
		};
		return gridColsMap[count] || "grid-cols-3";
	};

	return (
		<div className="space-y-4">
			{/* Search and filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						placeholder="Search logs by content..."
						defaultValue={searchQuery}
						onChange={handleSearchChange}
						className="pl-9"
						suppressHydrationWarning
					/>
				</div>

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

					{typeFilter !== "all" && (
						<Badge variant="secondary" className="text-xs">
							Type: {typeFilter}
						</Badge>
					)}
				</div>
			)}

			{/* Tabs for log types */}
			<Tabs
				value={activeTab}
				onValueChange={(value) => handleTypeChange(value)}
			>
				<TabsList
					className={`grid ${getGridColsClass(1 + (logTypes?.length || 3))}`}
				>
					<TabsTrigger value="all">All</TabsTrigger>
					{logTypes?.includes("error") && (
						<TabsTrigger value="error" className="text-red-500">
							Error
						</TabsTrigger>
					)}
					{logTypes?.includes("warning") && (
						<TabsTrigger value="warning" className="text-amber-500">
							Warning
						</TabsTrigger>
					)}
					{logTypes?.includes("info") && (
						<TabsTrigger value="info" className="text-primary">
							Info
						</TabsTrigger>
					)}
				</TabsList>
			</Tabs>

			{/* Logs table */}
			<Card className="overflow-hidden p-0">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="px-4 py-3">Time</TableHead>
							<TableHead className="px-4 py-3">Type</TableHead>
							<TableHead className="px-4 py-3">Message</TableHead>
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
										<Skeleton className="h-4 w-full" />
									</TableCell>
								</TableRow>
							))
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
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
											10);
								// Check if we should show type based on type difference with previous log or time difference
								const shouldTypeBeShown =
									index === 0 ||
									(prevLog && getLogType(prevLog) !== getLogType(log)) ||
									(prevLog &&
										Math.abs(
											new Date(log.created_at || "").getTime() -
												new Date(prevLog.created_at || "").getTime(),
										) /
											1000 >=
											10);

								// Determine log type
								const logType = getLogType(log);
								const typeColorClass = getLogTypeColorClass(logType);

								return (
									<TableRow key={log.id}>
										<TableCell className="px-4 py-3 text-sm">
											{shouldTimeBeShown ? formatDate(log.created_at) : ""}
										</TableCell>
										<TableCell className="px-4 py-3">
											{shouldTypeBeShown ? (
												<Badge variant="outline" className={typeColorClass}>
													{logType}
												</Badge>
											) : (
												""
											)}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											<DeviceLogEntries log={log} />
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
				<LogPagination
					page={page}
					perPage={ITEMS_PER_PAGE}
					totalItems={totalLogs}
					onPageChange={handlePageChange}
				/>
			)}
		</div>
	);
}
