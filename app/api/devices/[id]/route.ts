import { sql } from "kysely";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-user";
import { withExplicitUserScope, withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";
import type { Device } from "@/lib/types";

const MINUTE_OF_DAY_MIN = 0;
const MINUTE_OF_DAY_MAX = 23 * 60 + 59;

function parseMinuteOfDay(
	value: unknown,
	field: string,
): { ok: true; value: number | null } | { ok: false; response: NextResponse } {
	if (value === null) {
		return { ok: true, value: null };
	}
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: `${field} must be a finite number of minutes since midnight` },
				{ status: 422 },
			),
		};
	}

	const minute = Math.trunc(value);
	if (minute < MINUTE_OF_DAY_MIN || minute > MINUTE_OF_DAY_MAX) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					error: `${field} must be between ${MINUTE_OF_DAY_MIN} and ${MINUTE_OF_DAY_MAX}`,
				},
				{ status: 422 },
			),
		};
	}

	return { ok: true, value: minute };
}

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
		const isNumericId = /^\d+$/.test(id);

		const device = await withUserScope(async (scopedDb) => {
			if (isNumericId) {
				const byId = await scopedDb
					.selectFrom("devices")
					.selectAll()
					.where("id", "=", id)
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
			sleep_mode_enabled: deviceObj.sleep_mode_enabled,
			sleep_start_time: deviceObj.sleep_start_time,
			sleep_end_time: deviceObj.sleep_end_time,
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

/**
 * PATCH /api/devices/{id}
 * Update device sleep-mode settings. TRMNL contract — see openapi.yaml.
 *
 * Accepts a subset of fields. Unknown keys are ignored, unsupported keys
 * (`percent_charged` is computed at read time, never stored) are dropped
 * silently to keep the contract tolerant the same way TRMNL upstream is.
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	const { ready } = await checkDbConnection();
	if (!ready) {
		return NextResponse.json(
			{ error: "Database not available" },
			{ status: 503 },
		);
	}

	const userId = await getCurrentUserId();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
	}

	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json(
			{ error: "Body must be a JSON object" },
			{ status: 422 },
		);
	}

	const input = body as Record<string, unknown>;
	const updates: {
		sleep_mode_enabled?: boolean;
		sleep_start_time?: number | null;
		sleep_end_time?: number | null;
	} = {};

	if (typeof input.sleep_mode_enabled === "boolean") {
		updates.sleep_mode_enabled = input.sleep_mode_enabled;
	}
	if (input.sleep_start_time !== undefined) {
		const parsed = parseMinuteOfDay(input.sleep_start_time, "sleep_start_time");
		if (!parsed.ok) return parsed.response;
		updates.sleep_start_time = parsed.value;
	}
	if (input.sleep_end_time !== undefined) {
		const parsed = parseMinuteOfDay(input.sleep_end_time, "sleep_end_time");
		if (!parsed.ok) return parsed.response;
		updates.sleep_end_time = parsed.value;
	}

	try {
		// Friendly IDs starting with digits (e.g. "123ABC") would prefix-match
		// `Number.parseInt`, leaking the numeric-id branch onto the wrong
		// device. Only treat the path as a numeric id when it's fully numeric.
		const isNumericId = /^\d+$/.test(id);

		const target = await withExplicitUserScope(userId, (scopedDb) =>
			scopedDb
				.selectFrom("devices")
				.selectAll()
				.where(isNumericId ? "id" : "friendly_id", "=", id)
				.executeTakeFirst(),
		);

		if (!target) {
			return NextResponse.json({ error: "Device not found" }, { status: 404 });
		}

		// TRMNL contract is tolerant of read-only / unknown keys: a PATCH with
		// only `percent_charged` (computed at read time) or any other
		// unsupported field is a no-op, not a 422 — firmware that PATCHes on
		// every report still gets a 200 with the current device state.
		const updated =
			Object.keys(updates).length === 0
				? target
				: await withExplicitUserScope(userId, (scopedDb) =>
						scopedDb
							.updateTable("devices")
							.set({
								...updates,
								updated_at: sql`CURRENT_TIMESTAMP`,
							})
							.where("id", "=", target.id)
							.returningAll()
							.executeTakeFirstOrThrow(),
					);

		return NextResponse.json({
			data: {
				id: Number.parseInt(updated.id.toString(), 10),
				name: updated.name,
				friendly_id: updated.friendly_id,
				sleep_mode_enabled: updated.sleep_mode_enabled,
				sleep_start_time: updated.sleep_start_time,
				sleep_end_time: updated.sleep_end_time,
			},
		});
	} catch (error) {
		logError(error as Error, {
			source: "api/devices/[id]",
			metadata: { id, op: "patch" },
		});
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
