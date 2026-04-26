"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";

async function requireAdmin() {
	const user = await getCurrentUser();
	if (!user || user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	return user;
}

export async function deleteAllSystemLogs(): Promise<{
	success: boolean;
	count?: number;
	error?: string;
}> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) {
		return { success: false, error: "Database not available" };
	}

	try {
		const result = await db
			.deleteFrom("system_logs")
			.where("id", "is not", null)
			.executeTakeFirst();

		return { success: true, count: Number(result.numDeletedRows) };
	} catch (error) {
		console.error("Error deleting system logs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteAllDeviceLogs(): Promise<{
	success: boolean;
	count?: number;
	error?: string;
}> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) {
		return { success: false, error: "Database not available" };
	}

	try {
		const result = await db
			.deleteFrom("logs")
			.where("id", ">", "0")
			.executeTakeFirst();

		return { success: true, count: Number(result.numDeletedRows) };
	} catch (error) {
		console.error("Error deleting device logs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
