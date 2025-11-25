"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	deleteAllDeviceLogs,
	deleteAllSystemLogs,
	fixDatabaseIssues,
} from "@/app/actions/maintenance";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function DatabaseMaintenance() {
	const [isLoading, setIsLoading] = useState<boolean>(false);

	// Handle deleting all system logs
	const handleDeleteAllSystemLogs = async () => {
		if (!confirm("Are you sure you want to delete all system logs?")) {
			return;
		}

		try {
			setIsLoading(true);
			const result = await deleteAllSystemLogs();

			if (result.success) {
				toast.success(`Successfully deleted ${result.count || 0} system logs`);
			} else {
				toast.error(`Failed to delete system logs: ${result.error}`);
			}
		} catch (error) {
			console.error("Error deleting system logs:", error);
			toast.error("Failed to delete system logs");
		} finally {
			setIsLoading(false);
		}
	};

	// Handle deleting all device logs
	const handleDeleteAllDeviceLogs = async () => {
		if (!confirm("Are you sure you want to delete all device logs?")) {
			return;
		}

		try {
			setIsLoading(true);
			const result = await deleteAllDeviceLogs();

			if (result.success) {
				toast.success(`Successfully deleted ${result.count || 0} device logs`);
			} else {
				toast.error(`Failed to delete device logs: ${result.error}`);
			}
		} catch (error) {
			console.error("Error deleting device logs:", error);
			toast.error("Failed to delete device logs");
		} finally {
			setIsLoading(false);
		}
	};

	// Handle fixing database issues
	const handleFixDatabaseIssues = async () => {
		try {
			setIsLoading(true);
			const result = await fixDatabaseIssues();

			if (result.success) {
				toast.success("Database issues fixed successfully");
			} else {
				toast.error(`Failed to fix database issues: ${result.error}`);
			}
		} catch (error) {
			console.error("Error fixing database issues:", error);
			toast.error("Failed to fix database issues");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div>
			<h3 className="text-2xl font-semibold mb-4">Database Maintenance</h3>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<Card>
					<CardHeader>
						<CardTitle>Database Initialization</CardTitle>
						<CardDescription>
							Initialize the database schema for your application.
						</CardDescription>
					</CardHeader>
					<CardFooter className="flex flex-col space-y-2">
						<Button className="w-full" asChild>
							<Link href="/maintenance/init/">Initialize Database</Link>
						</Button>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Fix Database Issues</CardTitle>
						<CardDescription>
							Replace null values with appropriate defaults.
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							onClick={handleFixDatabaseIssues}
							disabled={isLoading}
							className="w-full"
						>
							{isLoading ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Fixing...
								</>
							) : (
								"Fix Database Issues"
							)}
						</Button>
					</CardFooter>
				</Card>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Delete System Logs</CardTitle>
						<CardDescription>
							Delete all system logs from the database.
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							onClick={handleDeleteAllSystemLogs}
							disabled={isLoading}
							className="w-full"
							variant="destructive"
						>
							{isLoading ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete All System Logs"
							)}
						</Button>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Delete Device Logs</CardTitle>
						<CardDescription>
							Delete all device logs from the database.
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							onClick={handleDeleteAllDeviceLogs}
							disabled={isLoading}
							className="w-full"
							variant="destructive"
						>
							{isLoading ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete All Device Logs"
							)}
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
