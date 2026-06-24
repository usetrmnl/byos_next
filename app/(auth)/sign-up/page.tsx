import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getDatabaseSetupStatus } from "@/lib/database/utils";
import SignUpForm from "./sign-up-form";

async function SignUpContent() {
	await connection();
	const setup = await getDatabaseSetupStatus();

	if (!setup.ready) {
		redirect("/setup");
	}

	if (!setup.needsAdminBootstrap) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-2xl">Sign up disabled</CardTitle>
						<CardDescription>
							This instance already has an account. Ask an admin to invite or
							create users.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button asChild className="w-full">
							<Link href="/sign-in">Sign in</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return <SignUpForm />;
}

export default function SignUpPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center p-4 text-sm text-muted-foreground">
					Checking setup status...
				</div>
			}
		>
			<SignUpContent />
		</Suspense>
	);
}
