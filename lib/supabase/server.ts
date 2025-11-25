import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
/**
 * Creates a Supabase client and checks if the database is properly configured
 * @returns Object containing the Supabase client and database readiness information
 */
export async function createClient(): Promise<{
	supabase: SupabaseClient | null;
	dbStatus: {
		ready: boolean;
		error?: string;
		PostgresUrl?: string;
	};
}> {
	const cookieStore = await cookies();
	// Step 1: Check if Supabase API environment variables are present
	const hasSupabaseAPI =
		process.env.NEXT_PUBLIC_SUPABASE_URL &&
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!hasSupabaseAPI) {
		// Supabase API variables missing: cannot perform a schema check
		console.log(
			"Supabase API variables (NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing.",
		);
		console.log(
			"Please obtain these from your Supabase dashboard and set them.",
		);
		return {
			supabase: null,
			dbStatus: {
				ready: false,
				error: "SUPABASE_API_ENV_VARS_MISSING",
			},
		};
	}

	// Create the Supabase client with the environment variables
	// We've already checked they exist above, so we can safely use them
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					// Use for...of instead of forEach
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch {
					// The `setAll` method was called from a Server Component.
					// This can be ignored if you have middleware refreshing
					// user sessions.
				}
			},
		},
	});

	// Check database readiness
	const dbStatus = await isDatabaseReady(supabase);

	return { supabase, dbStatus };
}

/**
 * Checks if the database is properly configured and ready for use
 * @param client - The Supabase client to use for database checks
 * @returns Object containing database readiness status and additional information
 */
export async function isDatabaseReady(client: SupabaseClient): Promise<{
	ready: boolean;
	error?: string;
	PostgresUrl?: string;
}> {
	// Step 1: Perform a schema check to see if the expected tables exist
	try {
		const doesTablePassTest = {
			devices: true,
			logs: true,
			system_logs: true,
			playlists: true,
			playlist_items: true,
		};

		for (const table of Object.keys(doesTablePassTest)) {
			try {
				const { error } = await client.from(table).select("*");
				if (error) {
					doesTablePassTest[table as keyof typeof doesTablePassTest] = false;
				}
			} catch (error) {
				doesTablePassTest[table as keyof typeof doesTablePassTest] = false;
				console.error(`Error checking table ${table}:`, error);
			}
		}
		const schemaReady =
			doesTablePassTest.devices &&
			doesTablePassTest.logs &&
			doesTablePassTest.system_logs &&
			doesTablePassTest.playlists &&
			doesTablePassTest.playlist_items;

		if (schemaReady) {
			// The schema is correct; the app is ready to run
			// console.log("Database schema verified. The app is ready to run.");
			return { ready: true };
		}
	} catch (error) {
		console.error("Error checking database schema:", error);
	}

	console.log("Schema check failed, checking environment for next steps");

	// Check if POSTGRES_URL is available
	const hasPostgresUrl = !!process.env.POSTGRES_URL;

	// If schema check fails and we have a postgres URL
	if (hasPostgresUrl) {
		try {
			// Safely handle the POSTGRES_URL
			const postgresUrl = process.env.POSTGRES_URL || "";
			const url = new URL(postgresUrl);

			// Extract username and password
			const username = url.username;
			const password = url.password;

			// Construct the connection string
			return {
				ready: false,
				error: "SHOW_USER_DATABASE_INITIALISATION_UI", // Keep the original error code for compatibility
				PostgresUrl: `postgresql://${username}:${password}@${url.host}${url.pathname}`,
			};
		} catch (error) {
			console.error("Error parsing POSTGRES_URL:", error);
			return {
				ready: false,
				error: "INVALID_POSTGRES_URL",
			};
		}
	}

	// No postgres URL available
	return {
		ready: false,
		error: "MANUAL_DB_SETUP_REQUIRED",
	};
}
