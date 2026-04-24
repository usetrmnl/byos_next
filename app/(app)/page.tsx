import { headers } from "next/headers";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DbInitializer } from "@/components/dashboard/db-initializer";
import { Badge } from "@/components/ui/badge";
import { PageTemplate } from "@/components/common/page-template";
import { getInitData } from "@/lib/getInitData";
import DashboardClientPage from "./client-page";

// Dashboard data component that uses the cached data
const DashboardData = async () => {
	// Get data from the centralized getInitData
	// Since this is cached, it won't cause duplicate requests
	const { devices, systemLogs, dbStatus } = await getInitData();
	if (!dbStatus.ready) {
		return (
			<>
				<div className="mt-4 rounded-lg border bg-card shadow-sm">
					{dbStatus.error === "ERROR_ENV_VAR_DATABASE_URL_NOT_SET" && (
						<div className="p-6 border-b">
							<h3 className="font-bold text-2xl mb-2 tracking-tight">
								Database not configured
							</h3>
							<p className="mb-4 text-muted-foreground">
								The{" "}
								<span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-sm">
									DATABASE_URL
								</span>{" "}
								environment variable is not set. Add it to your{" "}
								<span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-sm">
									.env
								</span>{" "}
								file to continue.
							</p>

							<div className="mt-6 space-y-4">
								<p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
									How to fix
								</p>

								<div className="pl-4 border-l-2 border-primary/40">
									<p className="font-medium mb-1">
										Option 1 — Vercel + Supabase integration
									</p>
									<p className="text-sm text-muted-foreground">
										Open{" "}
										<a
											href="https://app.supabase.com/project/_/settings/integrations"
											className="text-primary hover:underline font-medium"
										>
											Supabase Dashboard Integrations
										</a>
										, verify your Vercel connection, toggle
										&ldquo;Development&rdquo; on, then &ldquo;Manage&rdquo;
										&rarr; &ldquo;Resync environment variables&rdquo;. Locally,
										run{" "}
										<span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-xs">
											vercel link
										</span>{" "}
										and{" "}
										<span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-xs">
											vercel env pull
										</span>
										.
									</p>
								</div>

								<div className="pl-4 border-l-2 border-primary/40">
									<p className="font-medium mb-1">
										Option 2 — Add credentials manually
									</p>
									<p className="text-sm text-muted-foreground">
										Grab credentials from{" "}
										<a
											href="https://app.supabase.com/project/_/settings/api?showConnect=true"
											className="text-primary hover:underline font-medium"
										>
											Supabase API Settings
										</a>{" "}
										(under &ldquo;App Frameworks&rdquo;), save to{" "}
										<span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-xs">
											.env
										</span>
										, then run the SQL below in the{" "}
										<a
											href="https://app.supabase.com/project/_/sql/new"
											className="text-primary hover:underline font-medium"
										>
											Supabase SQL Editor
										</a>
										.
									</p>
								</div>
							</div>
						</div>
					)}
					{dbStatus.error?.includes("Missing required tables") && (
						<div className="p-6 border-b">
							<h3 className="font-bold text-2xl mb-2 tracking-tight">
								Database schema incomplete
							</h3>
							<p className="text-muted-foreground">
								Missing tables:{" "}
								<span className="font-mono text-foreground">
									{dbStatus.error?.replace("Missing required tables: ", "")}
								</span>
							</p>
						</div>
					)}
					<DbInitializer connectionUrl={dbStatus.PostgresUrl} />
				</div>
				<DashboardSkeleton className="filter blur-[1px] pointer-events-none mt-6" />
			</>
		);
	}

	return <DashboardClientPage devices={devices} systemLogs={systemLogs} />;
};

export default async function Dashboard() {
	// Access headers first to allow time-based operations in Server Component
	// We need to actually read from headers to access uncached request data
	const headersList = await headers();
	// Read a header to ensure we've accessed uncached request data
	const _userAgent = headersList.get("user-agent");

	// Get minimal data for the header only
	const { dbStatus } = await getInitData();

	// Now we can safely use new Date() after accessing headers
	const currentHour = new Date().getHours();
	const greeting =
		currentHour < 12
			? "morning ☀️"
			: currentHour < 18
				? "afternoon ☕️"
				: "evening 🌙";

	return (
		<PageTemplate
			title={
				<h1 className="text-3xl font-bold flex items-center">
					Good {greeting}
					{!dbStatus.ready && (
						<Badge
							variant="outline"
							className="ml-2 border-primary/30 bg-primary/10 text-primary"
						>
							noDB mode
						</Badge>
					)}
				</h1>
			}
		>
			<Suspense fallback={<DashboardSkeleton />}>
				<DashboardData />
			</Suspense>
		</PageTemplate>
	);
}
