import { connection } from "next/server";
import { Suspense } from "react";
import { fetchSystemLogs } from "@/app/actions/system";
import { PageTemplate } from "@/components/common/page-template";
import DbNotConfiguredErrorCard from "@/components/error-cards/db-not-configured-error-card";
import SystemLogsViewerSkeleton from "@/components/system-logs/system-logs-viewer-skeleton";
import { getDbStatus } from "@/lib/database/utils";
import { SystemLogsClientPage } from "./client-page";

export const metadata = {
	title: "System Logs",
	description: "View and search system logs",
};

const INITIAL_PAGE_SIZE = 15;

// SystemLogs data component that fetches its own data
const SystemLogsData = async () => {
	const dbStatus = await getDbStatus();

	if (!dbStatus.ready) {
		return (
			<>
				<DbNotConfiguredErrorCard status={dbStatus} pageName="System logs" />
				<SystemLogsViewerSkeleton className="filter blur-[1px] pointer-events-none mt-6" />
			</>
		);
	}

	const { logs, total, uniqueSources } = await fetchSystemLogs({
		page: 1,
		perPage: INITIAL_PAGE_SIZE,
	});

	return (
		<div className="w-full overflow-hidden">
			<SystemLogsClientPage
				perPage={INITIAL_PAGE_SIZE}
				initialData={{
					logs,
					total,
					uniqueSources,
				}}
			/>
		</div>
	);
};

export default async function SystemLogsPage() {
	await connection();

	return (
		<PageTemplate
			title="System Logs"
			subtitle="View, search, and filter system logs across your application."
		>
			<Suspense fallback={<SystemLogsViewerSkeleton />}>
				<SystemLogsData />
			</Suspense>
		</PageTemplate>
	);
}
