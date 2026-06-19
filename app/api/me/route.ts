import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getCurrentUser } from "@/lib/auth/get-user";
import { logInfo } from "@/lib/logger";

/**
 * GET /api/me
 * Get current user data
 */
export async function GET(request: Request) {
	logInfo("User data request", {
		source: "api/me",
		metadata: { hasAuthHeader: Boolean(request.headers.get("Authorization")) },
	});

	const user = auth ? await getCurrentUser().catch(() => null) : null;
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.json(
		{
			data: {
				id: user.id,
				name: user.name,
				email: user.email,
				first_name: user.name.split(" ")[0] ?? null,
				last_name: user.name.split(" ").slice(1).join(" ") || null,
				locale: "en",
				time_zone: "UTC",
				time_zone_iana: "UTC",
				utc_offset: 0,
			},
		},
		{ status: 200 },
	);
}
