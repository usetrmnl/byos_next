import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SystemLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/helpers";

export function formatLogMetadata(metadata: string): string {
	try {
		return JSON.stringify(JSON.parse(metadata), null, 2);
	} catch {
		return metadata;
	}
}

export function getLogDisplayState(logs: SystemLog[], index: number) {
	const log = logs[index];
	const prevLog = index > 0 ? logs[index - 1] : null;
	const diffSec =
		prevLog &&
		Math.abs(
			new Date(log.created_at || "").getTime() -
				new Date(prevLog.created_at || "").getTime(),
		) / 1000;
	const separated = typeof diffSec === "number" && diffSec >= 3;

	return {
		showTime: index === 0 || separated,
		showLevel:
			index === 0 || (prevLog && prevLog.level !== log.level) || separated,
	};
}

export function SystemLogLevelBadge({
	level,
	compact = false,
}: {
	level: SystemLog["level"];
	compact?: boolean;
}) {
	const styles: Record<NonNullable<SystemLog["level"]>, string> = {
		error: "bg-destructive/10 text-destructive border-destructive/20",
		warning:
			"bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
		info: "bg-primary/10 text-primary border-primary/20",
		debug: "bg-muted text-muted-foreground border-border",
	};
	if (!level) return null;
	return (
		<Badge
			variant="outline"
			className={cn(
				"uppercase tracking-wider",
				compact ? "text-[10px]" : "text-xs",
				styles[level],
			)}
		>
			{level}
		</Badge>
	);
}

export function SystemLogsList({
	logs,
	emptyLabel,
	metadataMode = "details",
	expandedLogs = {},
	onToggleExpanded,
}: {
	logs: SystemLog[];
	emptyLabel: string;
	metadataMode?: "details" | "button";
	expandedLogs?: Record<string, boolean>;
	onToggleExpanded?: (id: string) => void;
}) {
	return (
		<>
			<MobileSystemLogs
				logs={logs}
				emptyLabel={emptyLabel}
				metadataMode={metadataMode}
				expandedLogs={expandedLogs}
				onToggleExpanded={onToggleExpanded}
			/>
			<DesktopSystemLogs
				logs={logs}
				emptyLabel={emptyLabel}
				metadataMode={metadataMode}
				expandedLogs={expandedLogs}
				onToggleExpanded={onToggleExpanded}
			/>
		</>
	);
}

function MobileSystemLogs({
	logs,
	emptyLabel,
	metadataMode,
	expandedLogs,
	onToggleExpanded,
}: {
	logs: SystemLog[];
	emptyLabel: string;
	metadataMode: "details" | "button";
	expandedLogs: Record<string, boolean>;
	onToggleExpanded?: (id: string) => void;
}) {
	if (logs.length === 0) {
		return (
			<div className="px-4 py-10 text-center text-sm text-muted-foreground md:hidden">
				{emptyLabel}
			</div>
		);
	}

	return (
		<div className="divide-y md:hidden">
			{logs.map((log, index) => {
				const { showTime } = getLogDisplayState(logs, index);

				return (
					<article key={log.id} className="space-y-1 px-4 py-2">
						<div className="flex items-center justify-between gap-3">
							<div className="min-w-0 text-[11px] text-muted-foreground">
								<span className="tabular-nums" suppressHydrationWarning>
									{showTime ? formatDate(log.created_at) : ""}
								</span>
								<span className="mx-1 text-muted-foreground/60">·</span>
								<span className="truncate">
									{log.source || "Unknown source"}
								</span>
							</div>
							<SystemLogLevelBadge level={log.level} compact />
						</div>
						<p className="break-words text-sm leading-snug">{log.message}</p>
						{log.metadata && (
							<LogMetadata
								log={log}
								mode={metadataMode}
								expanded={Boolean(expandedLogs[log.id])}
								onToggleExpanded={onToggleExpanded}
							/>
						)}
					</article>
				);
			})}
		</div>
	);
}

function DesktopSystemLogs({
	logs,
	emptyLabel,
	metadataMode,
	expandedLogs,
	onToggleExpanded,
}: {
	logs: SystemLog[];
	emptyLabel: string;
	metadataMode: "details" | "button";
	expandedLogs: Record<string, boolean>;
	onToggleExpanded?: (id: string) => void;
}) {
	return (
		<div className="hidden overflow-x-auto md:block">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[80px]">Time</TableHead>
						<TableHead className="w-[80px]">Level</TableHead>
						<TableHead>Source</TableHead>
						<TableHead>Message</TableHead>
						<TableHead className="max-w-[220px]">Metadata</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{logs.length > 0 ? (
						logs.map((log, index) => {
							const { showTime, showLevel } = getLogDisplayState(logs, index);

							return (
								<TableRow key={log.id}>
									<TableCell
										className="text-xs tabular-nums text-muted-foreground"
										suppressHydrationWarning
									>
										{showTime ? formatDate(log.created_at) : ""}
									</TableCell>
									<TableCell>
										{showLevel ? (
											<SystemLogLevelBadge level={log.level} compact />
										) : (
											""
										)}
									</TableCell>
									<TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
										{log.source || "—"}
									</TableCell>
									<TableCell className="max-w-[300px] truncate text-sm">
										{log.message}
									</TableCell>
									<TableCell className="max-w-[220px] text-xs text-muted-foreground">
										{log.metadata ? (
											<LogMetadata
												log={log}
												mode={metadataMode}
												expanded={Boolean(expandedLogs[log.id])}
												onToggleExpanded={onToggleExpanded}
											/>
										) : (
											<span>—</span>
										)}
									</TableCell>
								</TableRow>
							);
						})
					) : (
						<TableRow>
							<TableCell
								colSpan={5}
								className="h-32 text-center text-sm text-muted-foreground"
							>
								{emptyLabel}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function LogMetadata({
	log,
	mode,
	expanded,
	onToggleExpanded,
}: {
	log: SystemLog;
	mode: "details" | "button";
	expanded: boolean;
	onToggleExpanded?: (id: string) => void;
}) {
	if (mode === "details") {
		return (
			<details className="text-xs text-muted-foreground">
				<summary className="cursor-pointer py-0.5 font-medium text-foreground">
					Metadata
				</summary>
				<pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 font-mono text-[11px]">
					{formatLogMetadata(log.metadata ?? "")}
				</pre>
			</details>
		);
	}

	return (
		<div className="flex items-start justify-between gap-1">
			<div className="w-full max-w-[120px] font-mono text-xs md:max-w-[200px] lg:max-w-[400px]">
				{expanded ? (
					<div className="h-[200px] w-full overflow-auto pt-2">
						<pre className="whitespace-pre-wrap break-words">
							{formatLogMetadata(log.metadata ?? "")}
						</pre>
					</div>
				) : (
					<div className="h-8 truncate pt-2">{log.metadata}</div>
				)}
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => onToggleExpanded?.(log.id)}
				aria-label={expanded ? "Collapse details" : "Expand details"}
				className="bg-transparent"
			>
				{expanded ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)}
			</Button>
		</div>
	);
}
