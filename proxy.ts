import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const PUBLIC_API_PATHS = [
	"/api/auth",
	"/api/bitmap",
	"/api/categories",
	"/api/display",
	"/api/ips",
	"/api/log",
	"/api/models",
	"/api/palettes",
	"/api/setup",
];

// Paths that don't require authentication.
// Includes metadata routes (manifest, social card) and branding assets used as
// favicons/app icons, which browsers and crawlers fetch without a session.
const PUBLIC_PATHS = [
	"/_next",
	"/favicon.ico",
	"/manifest.webmanifest",
	"/opengraph-image",
	"/twitter-image",
	"/icon",
	"/apple-icon",
	"/trmnl-icons",
	"/sign-in",
	"/sign-up",
	"/recover",
];

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip auth for public paths
	if (
		PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
		PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))
	) {
		return NextResponse.next();
	}

	// Skip auth check if authentication is disabled (mono-user mode)
	if (!auth) {
		return NextResponse.next();
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}

	return NextResponse.next();
}
