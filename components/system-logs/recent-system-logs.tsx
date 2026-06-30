import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { SystemLog } from "@/lib/types";
import { SystemLogsList } from "./system-logs-list";

export function RecentSystemLogs({ systemLogs }: { systemLogs: SystemLog[] }) {
	return (
		<section className="overflow-hidden rounded-2xl border bg-card">
			<header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
				<div className="flex items-center gap-2">
					<h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Recent system logs
					</h3>
					<span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
						{systemLogs.length}
					</span>
				</div>
				<Link
					href="/system-logs"
					className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
				>
					See all
					<ArrowRight className="h-3.5 w-3.5" />
				</Link>
			</header>
			<SystemLogsList
				logs={systemLogs}
				emptyLabel="No system logs to show"
				metadataMode="details"
			/>
		</section>
	);
}
