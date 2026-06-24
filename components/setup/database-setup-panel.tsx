import { DbInitializer } from "@/components/dashboard/db-initializer";

type DatabaseSetupPanelProps = {
	dbStatus: {
		ready: boolean;
		error?: string;
		databaseConfigured: boolean;
	};
};

type SetupIssue =
	| "unconfigured"
	| "missing-tables"
	| "pending"
	| "error"
	| null;

function classifySetupIssue(
	dbStatus: DatabaseSetupPanelProps["dbStatus"],
): SetupIssue {
	if (!dbStatus.databaseConfigured) return "unconfigured";
	const { error } = dbStatus;
	if (!error) return null;
	if (error.startsWith("Missing required tables:")) return "missing-tables";
	if (error.startsWith("Pending database migrations:")) return "pending";
	return "error";
}

export function DatabaseSetupPanel({ dbStatus }: DatabaseSetupPanelProps) {
	const issue = classifySetupIssue(dbStatus);

	return (
		<div className="mt-4 rounded-lg border bg-card shadow-sm">
			{issue === "unconfigured" && (
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
								Option 1 - Vercel + Supabase integration
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
								&ldquo;Development&rdquo; on, then &ldquo;Manage&rdquo; - &gt;
								&ldquo;Resync environment variables&rdquo;. Locally, run{" "}
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
								Option 2 - Add credentials manually
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

			{issue === "missing-tables" && (
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

			{issue === "pending" && (
				<div className="p-6 border-b">
					<h3 className="font-bold text-2xl mb-2 tracking-tight">
						Database migrations pending
					</h3>
					<p className="text-muted-foreground">
						Pending migrations:{" "}
						<span className="font-mono text-foreground">
							{dbStatus.error?.replace("Pending database migrations: ", "")}
						</span>
					</p>
				</div>
			)}

			{issue === "error" && (
				<div className="p-6 border-b">
					<h3 className="font-bold text-2xl mb-2 tracking-tight">
						Database unavailable
					</h3>
					<p className="text-muted-foreground">
						The server could not complete the database setup check.
					</p>
					<p className="mt-2 break-all font-mono text-xs text-muted-foreground">
						{dbStatus.error}
					</p>
				</div>
			)}

			<DbInitializer databaseConfigured={dbStatus.databaseConfigured} />
		</div>
	);
}
