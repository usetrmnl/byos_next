// import { DatabaseMaintenance } from "@/components/maintenance/database-maintenance";
// import { DeviceManagement } from "@/components/maintenance/device-management";
// import { Button } from "@/components/ui/button";
// import { createClient } from "@/lib/supabase/server";
// import { AlertCircle } from "lucide-react";
// import Link from "next/link";
// import { Suspense } from "react";

export const metadata = {
	title: "Maintenance",
	description: "Manage your database and devices",
};

export default async function Page() {
	// const { dbStatus } = await createClient();

	return (
		<>
			<div className="mb-6">
				<h2 className="mt-10 scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
					Maintenance
				</h2>
				<p className="text-muted-foreground">
					This page is coming soon. Please check back later for maintenance
					tools.
				</p>
			</div>

			{/* <div className="space-y-8">
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
								Unable to connect to the database. Maintenance tools cannot be
								displayed.
							</p>
							<Button asChild>
								<Link href="/">Go to Dashboard</Link>
							</Button>
						</div>
					</>
				) : (
					<Suspense fallback={<div>Loading...</div>}>
						<DatabaseMaintenance />
						<DeviceManagement />
					</Suspense>
				)}
			</div> */}
		</>
	);
}
