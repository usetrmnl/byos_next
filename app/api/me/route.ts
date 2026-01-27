import { NextResponse } from "next/server";
import { logInfo } from "@/lib/logger";

/**
 * GET /api/me
 * Get current user data
 *
 * Note: BYOS doesn't currently have user authentication.
 * This endpoint returns a stub response for compatibility.
 * In the future, this can be enhanced with actual user authentication.
 */
export async function GET(request: Request) {
	// Check for Authorization header (Bearer token)
	const authHeader = request.headers.get("Authorization");
	const bearerToken = authHeader?.replace("Bearer ", "");

	logInfo("User data request", {
		source: "api/me",
		metadata: { hasAuth: !!bearerToken },
	});

	// For now, return a stub user response
	// In the future, this should validate the bearer token and return actual user data
	return NextResponse.json(
		{
			data: {
				id: 0,
				name: "BYOS User",
				email: null,
				first_name: null,
				last_name: null,
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
