import { Suspense } from "react";
import Link from "next/link";
import SystemLogsViewer from "@/components/system-logs/system-logs-viewer";
import SystemLogsViewerSkeleton from "@/components/system-logs/system-logs-viewer-skeleton";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type { SystemLog } from "@/lib/supabase/types";

export const metadata = {
	title: "System Logs",
	description: "View and search system logs",
};

export default async function SystemLogsPage() {
	// Fetch initial data directly from the database
	const { supabase, dbStatus } = await createClient();

	// Initialize logs and sources
	let initialLogs: SystemLog[] = [];
	let uniqueSources: string[] = [];
	let totalLogs = 0;

	// Only fetch data if database is ready
	if (dbStatus.ready && supabase) {
		try {
			// Fetch initial logs (first page)
			const logsResult = await supabase
				.from("system_logs")
				.select("*", { count: "exact" })
				.order("created_at", { ascending: false })
				.range(0, 99); // Fetch first 100 logs

			initialLogs = logsResult.data || [];
			totalLogs = logsResult.count || 0;

			// Fetch unique sources for filters
			const sourcesResult = await supabase
				.from("system_logs")
				.select("source")
				.order("source");

			uniqueSources = Array.from(
				new Set(sourcesResult.data?.map((item) => item.source) || []),
			);
		} catch (error) {
			console.error("Error fetching initial system logs:", error);
		}
	}

	return (
		<>
			<div className="mb-6">
				<h2 className="mt-10 scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
					System Logs
				</h2>
				<p className="text-muted-foreground">
					View, search, and filter system logs across your application.
				</p>
			</div>

			{!dbStatus.ready ? (
				<>
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
						<div className="flex justify-center mb-4">
							<AlertCircle className="h-12 w-12 text-destructive" />
						</div>
						<h3 className="text-xl font-semibold mb-2">
							Database Connection Error
						</h3>
						<p className="text-muted-foreground mb-6">
							Unable to connect to the database. System logs cannot be
							displayed.
						</p>
						<Button asChild>
							<Link href="/">Go to Dashboard</Link>
						</Button>
					</div>
					<SystemLogsViewerSkeleton className="filter blur-[1px] pointer-events-none mt-6" />
				</>
			) : (
				<div className="w-full overflow-hidden">
					<Suspense fallback={<SystemLogsViewerSkeleton />}>
						<SystemLogsViewer
							initialData={{
								logs: initialLogs,
								total: totalLogs,
								uniqueSources: uniqueSources,
							}}
						/>
					</Suspense>
				</div>
			)}
		</>
	);
}
