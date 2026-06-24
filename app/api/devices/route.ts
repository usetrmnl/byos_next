import { connection, NextResponse } from "next/server";
import { mapTrmnlDeviceSummary } from "@/lib/database/mappers";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";

/**
 * GET /api/devices
 * List all devices
 */
export async function GET(_request: Request) {
	await connection();

	const { ready } = await checkDbConnection();

	if (!ready) {
		logInfo("Database not available for /api/devices", {
			source: "api/devices",
		});
		return NextResponse.json(
			{
				error: "Database not available",
			},
			{ status: 503 },
		);
	}

	try {
		const devices = await withUserScope((scopedDb) =>
			scopedDb
				.selectFrom("devices")
				.selectAll()
				.orderBy("created_at", "desc")
				.execute(),
		);

		const deviceData = devices.map((device) => mapTrmnlDeviceSummary(device));

		logInfo("Devices list request successful", {
			source: "api/devices",
			metadata: { count: deviceData.length },
		});

		return NextResponse.json(
			{
				data: deviceData,
			},
			{ status: 200 },
		);
	} catch (error) {
		logError(error as Error, {
			source: "api/devices",
		});
		return NextResponse.json(
			{
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
