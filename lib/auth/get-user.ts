import { headers } from "next/headers";
import { auth } from "./auth";

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
 * Get the current user ID, or null if auth is disabled.
 * Use this for database queries that need user scoping.
 */
export async function getCurrentUserId(): Promise<string | null> {
	const user = await getCurrentUser();
	return user?.id ?? null;
}
