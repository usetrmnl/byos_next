import { NextResponse } from "next/server";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";
import type { Device } from "@/lib/types";

/**
 * GET /api/devices/{id}
 * Get the data of a specific device
 *
 * @param id - Device ID (can be numeric ID or friendly_id)
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const { ready } = await checkDbConnection();

	if (!ready) {
		logInfo("Database not available for /api/devices/{id}", {
			source: "api/devices/[id]",
			metadata: { id },
		});
		return NextResponse.json(
			{
				error: "Database not available",
			},
			{ status: 503 },
		);
	}

	try {
		// Try to find by numeric ID first, then by friendly_id
		// RLS handles user filtering automatically
		const numericId = Number.parseInt(id, 10);

		const device = await withUserScope(async (scopedDb) => {
			if (!Number.isNaN(numericId)) {
				const byId = await scopedDb
					.selectFrom("devices")
					.selectAll()
					.where("id", "=", numericId.toString())
					.executeTakeFirst();
				if (byId) return byId;
			}

			return scopedDb
				.selectFrom("devices")
				.selectAll()
				.where("friendly_id", "=", id)
				.executeTakeFirst();
		});

		if (!device) {
			return NextResponse.json(
				{
					error: "Device not found",
				},
				{ status: 404 },
			);
		}

		const deviceObj = device as unknown as Device;

		// Transform device to match TRMNL API format
		const deviceData = {
			id: Number.parseInt(device.id.toString(), 10),
			name: deviceObj.name,
			friendly_id: deviceObj.friendly_id,
			mac_address: deviceObj.mac_address,
			battery_voltage: deviceObj.battery_voltage
				? Number.parseFloat(deviceObj.battery_voltage.toString())
				: null,
			rssi: deviceObj.rssi,
			percent_charged: deviceObj.battery_voltage
				? Math.min(
						100,
						Math.max(
							0,
							((Number.parseFloat(deviceObj.battery_voltage.toString()) - 3.0) /
								(4.2 - 3.0)) *
								100,
						),
					)
				: null,
			wifi_strength: deviceObj.rssi
				? Math.min(100, Math.max(0, ((deviceObj.rssi + 100) / 70) * 100))
				: null,
		};

		logInfo("Device data request successful", {
			source: "api/devices/[id]",
			metadata: { deviceId: id },
		});

		return NextResponse.json(
			{
				data: deviceData,
			},
			{ status: 200 },
		);
	} catch (error) {
		logError(error as Error, {
			source: "api/devices/[id]",
			metadata: { id },
		});
		return NextResponse.json(
			{
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
