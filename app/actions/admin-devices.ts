"use server";

import { db } from "@/lib/database/db";
import { getCurrentUser } from "@/lib/auth/get-user";
import { checkDbConnection } from "@/lib/database/utils";

async function requireAdmin() {
	const user = await getCurrentUser();
	if (!user || user.role !== "admin") {
		throw new Error("Unauthorized");
	}
	return user;
}

export interface AdminDevice {
	id: number;
	name: string;
	friendly_id: string;
	api_key: string;
	mac_address: string;
	user_id: string | null;
	user_name: string | null;
	user_email: string | null;
	created_at: string | null;
	updated_at: string | null;
}

export interface AdminUser {
	id: string;
	name: string;
	email: string;
}

export async function fetchAllDevicesAdmin(): Promise<AdminDevice[]> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) return [];

	const devices = await db
		.selectFrom("devices")
		.leftJoin("user", "devices.user_id", "user.id")
		.select([
			"devices.id",
			"devices.name",
			"devices.friendly_id",
			"devices.api_key",
			"devices.mac_address",
			"devices.user_id",
			"user.name as user_name",
			"user.email as user_email",
			"devices.created_at",
			"devices.updated_at",
		])
		.orderBy("devices.created_at", "desc")
		.execute();

	return devices as unknown as AdminDevice[];
}

export async function fetchAllUsersForAdmin(): Promise<AdminUser[]> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) return [];

	const users = await db
		.selectFrom("user")
		.select(["id", "name", "email"])
		.orderBy("name", "asc")
		.execute();

	return users as AdminUser[];
}

export async function assignDeviceToUser(
	deviceId: number,
	userId: string,
): Promise<{ success: boolean; error?: string }> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) return { success: false, error: "Database not available" };

	try {
		await db
			.updateTable("devices")
			.set({ user_id: userId, updated_at: new Date().toISOString() })
			.where("id", "=", String(deviceId))
			.execute();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function unassignDevice(
	deviceId: number,
): Promise<{ success: boolean; error?: string }> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) return { success: false, error: "Database not available" };

	try {
		await db
			.updateTable("devices")
			.set({ user_id: null, updated_at: new Date().toISOString() })
			.where("id", "=", String(deviceId))
			.execute();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function deleteDeviceAdmin(
	deviceId: number,
): Promise<{ success: boolean; error?: string }> {
	await requireAdmin();
	const { ready } = await checkDbConnection();
	if (!ready) return { success: false, error: "Database not available" };

	try {
		await db
			.deleteFrom("devices")
			.where("id", "=", String(deviceId))
			.execute();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
