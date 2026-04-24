"use server";

import JSZip from "jszip";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/get-user";
import {
	type CatalogEntry,
	fetchCatalog,
	isExternalCatalogEnabled,
} from "@/lib/catalog";
import {
	withUserScope,
	withUserScopeTransaction,
} from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";

// Hard limits to prevent resource abuse on hostile ZIPs.
const MAX_ZIP_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per file

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Verify the client-supplied CatalogEntry against the authoritative catalog.
 * Client-side server-action payloads are not trusted — without this check any
 * signed-in user could make the server fetch arbitrary URLs (SSRF).
 */
async function verifyCatalogEntry(
	entry: CatalogEntry,
): Promise<CatalogEntry | null> {
	const catalog = await fetchCatalog();
	const match = catalog.find((e) => e.trmnlp.id === entry.trmnlp.id);
	if (!match) return null;
	if (
		match.trmnlp.zip_url !== entry.trmnlp.zip_url ||
		match.name !== entry.name
	) {
		return null;
	}
	return match;
}

export async function installCommunityRecipe(
	clientEntry: CatalogEntry,
): Promise<{ success: boolean; error?: string; slug?: string }> {
	if (!isExternalCatalogEnabled()) {
		return {
			success: false,
			error: "External catalog is disabled on this server",
		};
	}
	const entry = await verifyCatalogEntry(clientEntry);
	if (!entry) {
		return {
			success: false,
			error: "Recipe not found in the trusted catalog",
		};
	}

	const zipUrl = entry.trmnlp.zip_url;
	if (!zipUrl) {
		return { success: false, error: "No zip_url available for this recipe" };
	}

	const userId = await getCurrentUserId();
	const slug = toSlug(entry.name);

	try {
		// Download the ZIP with a size cap and no redirect chasing.
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);
		let res: Response;
		try {
			res = await fetch(zipUrl, {
				signal: controller.signal,
				redirect: "follow",
			});
		} finally {
			clearTimeout(timeout);
		}
		if (!res.ok) {
			return {
				success: false,
				error: `Failed to download ZIP: ${res.status}`,
			};
		}

		const contentLength = Number(res.headers.get("content-length") ?? "0");
		if (contentLength > MAX_ZIP_BYTES) {
			return { success: false, error: "ZIP archive exceeds size limit" };
		}
		const buffer = await res.arrayBuffer();
		if (buffer.byteLength > MAX_ZIP_BYTES) {
			return { success: false, error: "ZIP archive exceeds size limit" };
		}

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
		let totalDecompressed = 0;
		let bombDetected = false;

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
						if (bombDetected) return;
						if (data.byteLength > MAX_FILE_BYTES) {
							bombDetected = true;
							return;
						}
						totalDecompressed += data.byteLength;
						if (totalDecompressed > MAX_DECOMPRESSED_BYTES) {
							bombDetected = true;
							return;
						}
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

		if (bombDetected) {
			return {
				success: false,
				error: "ZIP archive exceeds decompression size limit",
			};
		}

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
					oc
						.columns(["slug", "user_id"])
						.where("user_id", "is not", null)
						.doUpdateSet({
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
