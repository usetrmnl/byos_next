import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type React from "react";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
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
