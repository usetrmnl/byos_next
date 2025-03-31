import { Suspense } from "react";
import Link from "next/link";
import SystemLogsViewer from "@/components/system-logs/system-logs-viewer";
import SystemLogsViewerSkeleton from "@/components/system-logs/system-logs-viewer-skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { getInitData } from "@/lib/getInitData";

export const metadata = {
	title: "System Logs",
	description: "View and search system logs",
};

// SystemLogs data component that uses cached data
const SystemLogsData = async () => {
	// Get data from the centralized getInitData (cached)
	const { systemLogs, uniqueSources, totalLogs, dbStatus } =
		await getInitData();

	if (!dbStatus.ready) {
		return (
			<>
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<div className="flex justify-center mb-4">
						<AlertCircle className="h-12 w-12 text-destructive" />
					</div>
					<h3 className="text-xl font-semibold mb-2">
						Database Connection Error
					</h3>
					<p className="text-muted-foreground mb-6">
						Unable to connect to the database. System logs cannot be displayed.
					</p>
					<Button asChild>
						<Link href="/">Go to Dashboard</Link>
					</Button>
				</div>
				<SystemLogsViewerSkeleton className="filter blur-[1px] pointer-events-none mt-6" />
			</>
		);
	}

	return (
		<div className="w-full overflow-hidden">
			<SystemLogsViewer
				initialData={{
					logs: systemLogs,
					total: totalLogs,
					uniqueSources: uniqueSources,
				}}
			/>
		</div>
	);
};

export default function SystemLogsPage() {
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

			<Suspense fallback={<SystemLogsViewerSkeleton />}>
				<SystemLogsData />
			</Suspense>
		</>
	);
}
