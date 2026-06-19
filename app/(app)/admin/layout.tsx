import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type React from "react";
import { auth } from "@/lib/auth/auth";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// If auth is disabled, redirect away from admin pages
	if (!auth) {
		redirect("/");
	}

	await connection();

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// Check if user is admin
	const userRole = (session?.user as { role?: string } | undefined)?.role;
	if (userRole !== "admin") {
		redirect("/");
	}

	return <>{children}</>;
}
