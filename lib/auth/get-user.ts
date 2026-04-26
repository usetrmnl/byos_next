import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Stable user id for PostgreSQL RLS when authentication is disabled (`AUTH_ENABLED=false`).
 * Must match `migrations/0013_seed_mono_user.sql`.
 */
export const BYOS_MONO_USER_ID = "byos_mono_user";

export type CurrentUser = {
	id: string;
	name: string;
	email: string;
	role?: string;
} | null;

/**
 * Get the current authenticated user from the session.
 * Returns null if auth is disabled or user is not authenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
	if (!auth) {
		return null;
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return null;
	}

	return {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		role: (session.user as { role?: string }).role,
	};
}

/**
 * Get the current user ID for row-level security scoping.
 * When auth is disabled, returns {@link BYOS_MONO_USER_ID} so inserts pass recipes RLS and FK checks.
 * When auth is enabled, returns the signed-in user's id, or null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
	if (!auth) {
		return BYOS_MONO_USER_ID;
	}
	const user = await getCurrentUser();
	return user?.id ?? null;
}
