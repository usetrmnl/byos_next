"use server";

import { db } from "@/lib/database/db";
import type { MixupLayoutId as DbMixupLayoutId } from "@/lib/database/db.d";
import { checkDbConnection } from "@/lib/database/utils";
import type { Mixup, MixupSlot } from "@/lib/types";

/**
 * Fetch all mixups
 */
export async function fetchMixups(): Promise<Mixup[]> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return [];
	}

	const mixups = await db
		.selectFrom("mixups")
		.selectAll()
		.orderBy("created_at", "desc")
		.execute();

	return mixups as unknown as Mixup[];
}

/**
 * Fetch a single mixup with its slots
 */
export async function fetchMixupWithSlots(mixupId: string): Promise<{
	mixup: Mixup | null;
	slots: MixupSlot[];
}> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { mixup: null, slots: [] };
	}

	const [mixup, slots] = await Promise.all([
		db
			.selectFrom("mixups")
			.selectAll()
			.where("id", "=", mixupId)
			.executeTakeFirst(),
		db
			.selectFrom("mixup_slots")
			.selectAll()
			.where("mixup_id", "=", mixupId)
			.orderBy("order_index", "asc")
			.execute(),
	]);

	if (!mixup) {
		return { mixup: null, slots: [] };
	}

	return {
		mixup: mixup as unknown as Mixup,
		slots: slots as unknown as MixupSlot[],
	};
}

/**
 * Create a new mixup
 */
export async function createMixup(
	name: string,
	layoutId: string,
): Promise<{
	success: boolean;
	mixup?: Mixup;
	error?: string;
}> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		const mixup = await db
			.insertInto("mixups")
			.values({ name, layout_id: layoutId as DbMixupLayoutId })
			.returningAll()
			.executeTakeFirst();

		return { success: true, mixup: mixup as unknown as Mixup };
	} catch (error) {
		console.error("Error creating mixup:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Update a mixup
 */
export async function updateMixup(
	mixupId: string,
	name: string,
	layoutId: string,
): Promise<{ success: boolean; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		await db
			.updateTable("mixups")
			.set({
				name,
				layout_id: layoutId as DbMixupLayoutId,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", mixupId)
			.execute();

		return { success: true };
	} catch (error) {
		console.error("Error updating mixup:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Delete a mixup and all its slots
 */
export async function deleteMixup(mixupId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		await db.deleteFrom("mixups").where("id", "=", mixupId).execute();

		return { success: true };
	} catch (error) {
		console.error("Error deleting mixup:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Save a complete mixup with all its slots
 * This is the main function used to save from the builder
 */
export async function saveMixupWithSlots(mixupData: {
	id?: string;
	name: string;
	layout_id: string;
	assignments: Record<string, string>; // slot_id -> recipe_slug
}): Promise<{ success: boolean; mixupId?: string; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		return await db.transaction().execute(async (trx) => {
			let mixupId: string;

			// Create or update mixup
			if (mixupData.id) {
				// Update existing mixup
				await trx
					.updateTable("mixups")
					.set({
						name: mixupData.name,
						layout_id: mixupData.layout_id as DbMixupLayoutId,
						updated_at: new Date().toISOString(),
					})
					.where("id", "=", mixupData.id)
					.execute();

				mixupId = mixupData.id;

				// Delete existing slots
				await trx
					.deleteFrom("mixup_slots")
					.where("mixup_id", "=", mixupId)
					.execute();
			} else {
				// Create new mixup
				const newMixup = await trx
					.insertInto("mixups")
					.values({
						name: mixupData.name,
						layout_id: mixupData.layout_id as DbMixupLayoutId,
					})
					.returning("id")
					.executeTakeFirstOrThrow();

				mixupId = newMixup.id;
			}

			// Insert new slots
			const slotEntries = Object.entries(mixupData.assignments);
			if (slotEntries.length > 0) {
				const slotsToInsert = slotEntries.map(
					([slotId, recipeSlug], index) => ({
						mixup_id: mixupId,
						slot_id: slotId,
						recipe_slug: recipeSlug || null,
						order_index: index,
					}),
				);

				await trx.insertInto("mixup_slots").values(slotsToInsert).execute();
			}

			return { success: true, mixupId };
		});
	} catch (error) {
		console.error("Error saving mixup with slots:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
