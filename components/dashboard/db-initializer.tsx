"use client";

import { useState, useTransition } from "react";
import {
	Check,
	Copy,
	Play,
	AlertCircle,
	Loader2,
	ChevronDown,
	Code,
	RefreshCw,
} from "lucide-react";
import {
	executeSqlStatements,
	type SqlExecutionState,
	type SqlExecutionStatus,
} from "@/app/actions/execute-sql";
import { SQL_STATEMENTS } from "@/lib/database/sql-statements";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export function DbInitializer({ connectionUrl }: { connectionUrl?: string }) {
	const [isPending, startTransition] = useTransition();
	const [copied, setCopied] = useState<string | null>(null);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [executionState, setExecutionState] =
		useState<SqlExecutionState | null>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [copyAnimation, setCopyAnimation] = useState<string | null>(null);
	const router = useRouter();

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	const copyToClipboard = async (text: string, id: string) => {
		try {
			// Try using the modern Clipboard API first
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				setCopied(id);
				setCopyError(null);
				// Add animation feedback
				setCopyAnimation(id);
				setTimeout(() => setCopyAnimation(null), 500);
				setTimeout(() => setCopied(null), 2000);
			} else {
				// Fallback for older browsers
				const textArea = document.createElement("textarea");
				textArea.value = text;
				textArea.style.position = "fixed"; // Avoid scrolling to bottom
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();

				try {
					const successful = document.execCommand("copy");
					if (successful) {
						setCopied(id);
						setCopyError(null);
						// Add animation feedback
						setCopyAnimation(id);
						setTimeout(() => setCopyAnimation(null), 500);
					} else {
						setCopyError("Failed to copy");
					}
				} catch (err) {
					setCopyError("Failed to copy");
					console.error("Copy failed:", err);
				}

				document.body.removeChild(textArea);
				setTimeout(() => {
					setCopied(null);
					setCopyError(null);
				}, 2000);
			}
		} catch (err) {
			console.error("Copy failed:", err);
			setCopyError("Copy failed");
			setTimeout(() => setCopyError(null), 2000);
		}
	};

	// Check if all SQL statements have been successfully executed
	const allStatementsSucceeded = () => {
		if (!executionState) return false;

		const statuses = Object.values(executionState).map((item) => item.status);
		// Consider both "success" and "warning" as successful executions
		const allSuccess = statuses.every(
			(status) => status === "success" || status === "warning",
		);
		const noLoading = !statuses.includes("loading");

		return allSuccess && noLoading;
	};

	// Handle page refresh
	const handleRefresh = () => {
		router.refresh();
	};

	// Generate the complete SQL text for a statement including comments and results
	const generateCompleteSql = (
		key: string,
		item: (typeof SQL_STATEMENTS)[keyof typeof SQL_STATEMENTS],
	) => {
		const execution = executionState?.[key as keyof typeof SQL_STATEMENTS];
		const status = execution?.status || "idle";

		let sql = `-- ${item.title}`;

		// Add status indicator if not idle
		if (status !== "idle") {
			const statusText =
				status === "loading"
					? "running..."
					: status === "success"
						? "succeeded!"
						: status === "warning"
							? "warning!"
							: "failed!";
			sql += ` (${statusText})`;
		}

		sql += `\n-- ${item.description}\n`;
		sql += item.sql;

		// Add result information if available
		if (status !== "idle") {
			sql += "\n\n";
			if (status === "loading") {
				sql += "-- Executing...\n";
			} else {
				sql += `-- Result: ${execution?.executionTime ? `(${execution.executionTime}ms)` : ""}\n`;

				if (execution?.error) {
					if (status === "warning") {
						sql += `-- WARNING: ${execution.error}\n`;
						sql += "-- (This warning was non-fatal and execution continued)\n";
					} else {
						sql += `-- ERROR: ${execution.error}\n`;
					}
				} else if (execution?.result && execution.result.length > 0) {
					sql += `-- ${JSON.stringify(execution.result, null, 2).replace(/\n/g, "\n-- ")}\n`;
				} else {
					sql +=
						"-- Empty result (query executed successfully but returned no data)\n";
				}

				// Add notices if available
				if (execution?.notices && execution.notices.length > 0) {
					sql += "\n-- Database Notices:\n";
					sql += `-- ${JSON.stringify(execution.notices, null, 2).replace(/\n/g, "\n-- ")}\n`;
				}
			}
		}

		return sql;
	};

	const allSql = Object.entries(SQL_STATEMENTS)
		.map(([key, item]) => generateCompleteSql(key, item))
		.join("\n\n");

	const executeAll = () => {
		if (!connectionUrl) return;

		// Initialize all statements to loading state
		const initialState = Object.keys(SQL_STATEMENTS).reduce((acc, key) => {
			acc[key as keyof typeof SQL_STATEMENTS] = {
				status: "loading",
				result: [],
				notices: [],
			};
			return acc;
		}, {} as SqlExecutionState);

		setExecutionState(initialState);
		setIsExpanded(true);

		startTransition(async () => {
			const result = await executeSqlStatements();
			setExecutionState(result);
		});
	};

	const getStatusColor = (status: SqlExecutionStatus) => {
		switch (status) {
			case "idle":
				return "text-gray-500";
			case "loading":
				return "text-blue-500";
			case "success":
				return "text-green-600";
			case "warning":
				return "text-amber-500";
			case "error":
				return "text-red-600";
			default:
				return "text-gray-500";
		}
	};

	const getStatusIcon = (status: SqlExecutionStatus) => {
		switch (status) {
			case "loading":
				return <Loader2 className="h-3 w-3 animate-spin" />;
			case "success":
				return <Check className="h-3 w-3" />;
			case "warning":
				return <AlertCircle className="h-3 w-3" />;
			case "error":
				return <AlertCircle className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const getExecutionSummary = () => {
		if (!executionState) return null;

		const statuses = Object.values(executionState).map((item) => item.status);
		const successCount = statuses.filter(
			(status) => status === "success",
		).length;
		const warningCount = statuses.filter(
			(status) => status === "warning",
		).length;
		const errorCount = statuses.filter((status) => status === "error").length;
		const loadingCount = statuses.filter(
			(status) => status === "loading",
		).length;

		if (loadingCount > 0) {
			return (
				<div className="flex items-center gap-1 text-blue-500">
					<Loader2 className="h-3 w-3 animate-spin" />
					<span>Executing statements...</span>
				</div>
			);
		}

		if (successCount === 0 && errorCount === 0 && warningCount === 0) {
			return null;
		}

		// All statements have been executed
		const allCompleted = loadingCount === 0;
		// All statements succeeded (including warnings)
		const allSucceeded = allStatementsSucceeded();

		return (
			<div className="flex flex-col">
				<div className="flex items-center gap-3">
					{successCount > 0 && (
						<div className="flex items-center gap-1 text-green-600">
							<Check className="h-3 w-3" />
							<span>{successCount} succeeded</span>
						</div>
					)}
					{warningCount > 0 && (
						<div className="flex items-center gap-1 text-amber-500">
							<AlertCircle className="h-3 w-3" />
							<span>{warningCount} warnings</span>
						</div>
					)}
					{errorCount > 0 && (
						<div className="flex items-center gap-1 text-red-600">
							<AlertCircle className="h-3 w-3" />
							<span>{errorCount} failed</span>
						</div>
					)}
				</div>

				{allCompleted && (
					<div
						className={`text-sm mt-1 ${allSucceeded ? "text-green-600" : "text-red-600"}`}
					>
						{allSucceeded
							? "All database operations completed successfully. You can refresh the page to apply changes."
							: "Some operations failed. Please check the errors and try again."}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="container mx-auto p-4">
			{connectionUrl && (
				<div className="flex items-center gap-3 mb-4">
					<Button
						type="button"
						onClick={executeAll}
						disabled={isPending || allStatementsSucceeded()}
						className="bg-linear-to-r from-indigo-500 to-teal-400 text-white font-bold text-lg"
					>
						{isPending ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<Play className="h-3 w-3" />
						)}
						{isPending ? "Initializing..." : "Initialize my database for me"}
					</Button>

					{allStatementsSucceeded() && (
						<Button
							type="button"
							onClick={handleRefresh}
							className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
						>
							<RefreshCw className="h-3 w-3 mr-2" />
							Refresh Page to Apply Changes
						</Button>
					)}
				</div>
			)}
			<div className="font-mono text-sm relative border rounded">
				<div className="flex items-center justify-between p-2 border-b bg-gray-50 dark:bg-gray-800">
					<div className="flex items-center gap-2 px-2 py-1 rounded">
						<Code className="h-4 w-4 text-gray-500" />
						<span className="font-medium">
							{connectionUrl ? (
								<Input className="w-2xl" value={connectionUrl} readOnly />
							) : (
								"Database Initialization SQL"
							)}
						</span>
						{getExecutionSummary()}
					</div>

					<div className="flex gap-2">
						<Button
							type="button"
							onClick={() => copyToClipboard(allSql, "all")}
							className={`bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 min-h-[28px] min-w-[70px] justify-center shadow-sm ${copyAnimation === "all" ? "animate-pulse bg-green-100 dark:bg-green-800" : ""}`}
							aria-label="Copy all SQL statements"
						>
							{copied === "all" ? (
								<Check className="h-3 w-3" />
							) : (
								<Copy className="h-3 w-3" />
							)}
							{copied === "all" ? "Copied" : "Copy All"}
						</Button>
					</div>
				</div>

				{/* Copy error notification */}
				{copyError && (
					<div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs p-2 flex items-center justify-center">
						<AlertCircle className="h-3 w-3 mr-1" />
						{copyError}
					</div>
				)}

				<div
					className={`sql-content-container ${isExpanded ? "expanded" : ""}`}
					style={{
						display: "grid",
						gridTemplateRows: isExpanded ? "1fr" : "0fr",
						transition: "grid-template-rows 0.3s ease-in-out",
						overflow: "hidden",
					}}
				>
					<div className="sql-content min-h-[200px] overflow-hidden transition-all duration-300 ease-in-out">
						<pre className="overflow-auto p-4">
							<code>
								{Object.entries(SQL_STATEMENTS).map(([key, item], index) => {
									const execution =
										executionState?.[key as keyof typeof SQL_STATEMENTS];
									const status = execution?.status || "idle";
									const statementSql = generateCompleteSql(key, item);

									return (
										<div key={key} className="relative group">
											<div className="absolute right-0 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
												<button
													type="button"
													onClick={() => copyToClipboard(statementSql, key)}
													className={`bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 touch-action-manipulation min-h-[28px] min-w-[60px] justify-center shadow-sm ${copyAnimation === key ? "animate-pulse bg-green-100 dark:bg-green-800" : ""}`}
													aria-label={`Copy ${item.title} SQL statement`}
													tabIndex={0}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															copyToClipboard(statementSql, key);
														}
													}}
												>
													{copied === key ? (
														<Check className="h-3 w-3" />
													) : (
														<Copy className="h-3 w-3" />
													)}
													{copied === key ? "Copied" : "Copy"}
												</button>
											</div>

											{/* Title with status */}
											<div
												className={`flex items-center gap-1 ${getStatusColor(status)}`}
											>
												{getStatusIcon(status)}
												<span>{`-- ${item.title}${
													status !== "idle"
														? ` (${status === "loading" ? "running..." : status === "success" ? "succeeded!" : status === "warning" ? "warning!" : "failed!"})`
														: ""
												}`}</span>
											</div>

											{/* Description */}
											<div className="text-gray-500">{`-- ${item.description}`}</div>

											{/* SQL code */}
											<div className="my-2">{item.sql}</div>

											{/* Results section */}
											{status !== "idle" && (
												<div className={`my-2 ${getStatusColor(status)}`}>
													<div className="flex items-center gap-1">
														<span>{`-- Result${
															execution?.executionTime && status === "success"
																? `: (${execution.executionTime}ms)`
																: status === "loading"
																	? ": Executing..."
																	: ":"
														}`}</span>
													</div>

													{status !== "loading" && (
														<div className="whitespace-pre-wrap">
															{execution?.error ? (
																status === "warning" ? (
																	<div>
																		<div className="text-amber-500">{`-- WARNING: ${execution.error}`}</div>
																		<div className="text-amber-500">
																			-- (This warning was non-fatal and
																			execution continued)
																		</div>
																	</div>
																) : (
																	<div className="text-red-600">{`-- ERROR: ${execution.error}`}</div>
																)
															) : (
																<div>
																	{execution?.result &&
																	execution.result.length > 0 ? (
																		JSON.stringify(execution.result, null, 2)
																			.split("\n")
																			.map((line, i) => (
																				<div
																					key={i}
																					className="text-gray-700"
																				>{`-- ${line}`}</div>
																			))
																	) : (
																		<div className="text-gray-700">
																			-- Empty result (query executed
																			successfully but returned no data)
																		</div>
																	)}
																</div>
															)}
														</div>
													)}

													{/* Notices section */}
													{execution?.notices &&
														execution.notices.length > 0 &&
														status !== "loading" && (
															<div className="mt-2">
																<div>{"-- Database Notices:"}</div>
																<div className="whitespace-pre-wrap">
																	{JSON.stringify(execution.notices, null, 2)
																		.split("\n")
																		.map((line, i) => (
																			<div
																				key={i}
																				className="text-gray-700 dark:text-gray-300"
																			>{`-- ${line}`}</div>
																		))}
																</div>
															</div>
														)}
												</div>
											)}

											{index < Object.entries(SQL_STATEMENTS).length - 1 && (
												<div className="border-b border-gray-200 dark:border-gray-700 my-4" />
											)}
										</div>
									);
								})}
							</code>
						</pre>
					</div>
				</div>

				<div
					className={`${!isExpanded ? "absolute inset-0 mt-0 mb-0" : "relative mt-2 mb-2"} flex justify-center transition-all duration-300 ease-in-out`}
				>
					{!isExpanded && (
						<div className="w-full h-full bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none absolute" />
					)}
					<button
						type="button"
						onClick={toggleExpand}
						className={`${!isExpanded ? "absolute bottom-4 pointer-events-auto h-[1.5lh]" : ""} bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-gray-200 rounded-full px-4 py-1 text-xs flex items-center gap-1 shadow-sm`}
					>
						<ChevronDown
							className={`h-3 w-3 transform transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}
						/>
						<span>{isExpanded ? "Show less" : "Show more"}</span>
					</button>
				</div>
			</div>
		</div>
	);
}
