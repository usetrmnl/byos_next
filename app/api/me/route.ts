import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getCurrentUser } from "@/lib/auth/get-user";
import { logInfo } from "@/lib/logger";

/**
 * GET /api/me
 * Get current user data
 *
 * Returns the Better Auth session user when available, otherwise a TRMNL
 * compatibility stub for bearer-token clients.
 */
export async function GET(request: Request) {
	// Check for Authorization header (Bearer token)
	const authHeader = request.headers.get("Authorization");
	const bearerToken = authHeader?.replace("Bearer ", "");

	logInfo("User data request", {
		source: "api/me",
		metadata: { hasAuth: !!bearerToken },
	});

	const user = auth ? await getCurrentUser().catch(() => null) : null;

	return NextResponse.json(
		{
			data: {
				id: user?.id ?? 0,
				name: user?.name ?? "BYOS User",
				email: user?.email ?? null,
				first_name: user?.name?.split(" ")[0] ?? null,
				last_name: user?.name?.split(" ").slice(1).join(" ") || null,
				locale: "en",
				time_zone: "UTC",
				time_zone_iana: "UTC",
				utc_offset: 0,
				api_key: bearerToken || null,
			},
		},
		{ status: 200 },
	);
}
