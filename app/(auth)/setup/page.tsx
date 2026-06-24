import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DatabaseSetupPanel } from "@/components/setup/database-setup-panel";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getDatabaseSetupStatus } from "@/lib/database/utils";

async function SetupContent() {
	await connection();
	const setup = await getDatabaseSetupStatus();

	if (!setup.needsSetup) {
		redirect(auth ? "/sign-in" : "/");
	}

	if (setup.needsAdminBootstrap) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-lg">
					<CardHeader>
						<CardTitle className="text-2xl">Create the first admin</CardTitle>
						<CardDescription>
							The database is ready. Create the first account to finish setup.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">
							The first account created on this instance will be assigned the
							admin role automatically.
						</p>
						<Button asChild className="w-full">
							<Link href="/sign-up">Create admin account</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center p-4 md:p-8">
			<div className="mb-4">
				<h1 className="text-3xl font-bold tracking-tight">Set up BYOS</h1>
				<p className="mt-2 text-muted-foreground">
					Initialize the database before signing in.
				</p>
			</div>
			<DatabaseSetupPanel dbStatus={setup} />
		</div>
	);
}

export default function SetupPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center p-4 text-sm text-muted-foreground">
					Checking setup status...
				</div>
			}
		>
			<SetupContent />
		</Suspense>
	);
}
