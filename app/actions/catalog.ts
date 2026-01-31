"use server";

import JSZip from "jszip";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/get-user";
import type { CatalogEntry } from "@/lib/catalog";
import { withUserScope, withUserScopeTransaction } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export async function installCommunityRecipe(
	entry: CatalogEntry,
): Promise<{ success: boolean; error?: string; slug?: string }> {
	const zipUrl = entry.trmnlp.zip_url;
	if (!zipUrl) {
		return { success: false, error: "No zip_url available for this recipe" };
	}

	const userId = await getCurrentUserId();
	const slug = toSlug(entry.name);

	try {
		// Download the ZIP
		const res = await fetch(zipUrl);
		if (!res.ok) {
			return {
				success: false,
				error: `Failed to download ZIP: ${res.status}`,
			};
		}
		const buffer = await res.arrayBuffer();

		// Extract files
		const zip = await JSZip.loadAsync(buffer);
		const entryPath = entry.trmnlp.zip_entry_path ?? "";
		const prefix = entryPath
			? entryPath.endsWith("/")
				? entryPath
				: `${entryPath}/`
			: "";

		const files: { filename: string; content: string }[] = [];
		const filePromises: Promise<void>[] = [];

		zip.forEach((relativePath, file) => {
			if (file.dir) return;
			if (prefix && !relativePath.startsWith(prefix)) return;

			const filename = prefix
				? relativePath.slice(prefix.length)
				: relativePath;
			if (!filename) return;

			filePromises.push(
				file
					.async("uint8array")
					.then((data) => {
						// Skip binary files (files containing null bytes)
						if (data.includes(0)) return;
						const content = new TextDecoder("utf-8", { fatal: true }).decode(
							data,
						);
						files.push({ filename, content });
					})
					.catch(() => {
						// Skip files that aren't valid UTF-8
					}),
			);
		});

		await Promise.all(filePromises);

		if (files.length === 0) {
			return { success: false, error: "No files found in the ZIP archive" };
		}

		// Insert into database
		await withUserScopeTransaction(async (trx) => {
			// Upsert the recipe
			const recipe = await trx
				.insertInto("recipes")
				.values({
					name: entry.name,
					slug,
					type: "liquid",
					repo: entry.trmnlp.repo,
					screenshot_url: entry.screenshot_url,
					logo_url: entry.logo_url,
					author: entry.author?.name ?? entry.author?.github,
					author_github: entry.author?.github,
					zip_url: zipUrl,
					zip_entry_path: entry.trmnlp.zip_entry_path,
					category: entry.author_bio?.category,
					version: entry.trmnlp.version,
					user_id: userId,
				})
				.onConflict((oc) =>
					oc.column("slug").doUpdateSet({
						name: entry.name,
						repo: entry.trmnlp.repo,
						screenshot_url: entry.screenshot_url,
						logo_url: entry.logo_url,
						author: entry.author?.name ?? entry.author?.github,
						author_github: entry.author?.github,
						zip_url: zipUrl,
						zip_entry_path: entry.trmnlp.zip_entry_path,
						category: entry.author_bio?.category,
						version: entry.trmnlp.version,
						updated_at: new Date().toISOString(),
					}),
				)
				.returning("id")
				.executeTakeFirstOrThrow();

			// Delete old files, then re-insert
			await trx
				.deleteFrom("recipe_files")
				.where("recipe_id", "=", recipe.id)
				.execute();

			await trx
				.insertInto("recipe_files")
				.values(
					files.map((f) => ({
						recipe_id: recipe.id,
						filename: f.filename,
						content: f.content,
					})),
				)
				.execute();
		});

		revalidatePath("/recipes");
		return { success: true, slug };
	} catch (error) {
		console.error("Error installing community recipe:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function deleteRecipe(slug: string): Promise<void> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		throw new Error("Database client not initialized");
	}

	await withUserScope((scopedDb) =>
		scopedDb.deleteFrom("recipes").where("slug", "=", slug).execute(),
	);

	revalidatePath("/recipes");
	redirect("/recipes");
}
