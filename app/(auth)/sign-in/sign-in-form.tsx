"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";

interface SignInFormProps {
	dbReady: boolean;
	dbError?: string;
}

export default function SignInForm({ dbReady, dbError }: SignInFormProps) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dbReady) return;
		setError("");
		setIsLoading(true);

		try {
			const { data, error: authError } = await authClient.signIn.email({
				email,
				password,
			});

			if (authError) {
				setError(authError.message || "Failed to sign in. Please try again.");
				setIsLoading(false);
				return;
			}

			if (data) {
				router.push("/");
				router.refresh();
			}
		} catch (_err) {
			setError("An unexpected error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	const formDisabled = isLoading || !dbReady;

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Sign In</CardTitle>
					<CardDescription>
						Enter your email and password to access your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!dbReady && (
						<div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
							<p className="font-medium">Database is not reachable</p>
							<p className="mt-1 text-xs opacity-80">
								Sign-in is disabled until the server can connect to Postgres.
								Check <code className="font-mono">DATABASE_URL</code> and that
								the database is running.
							</p>
							<p className="mt-2 text-xs opacity-80">
								To run the server without authentication, restart it with{" "}
								<code className="font-mono">AUTH_ENABLED=false</code> for more
								instructions.
							</p>
							{dbError && (
								<p className="mt-2 font-mono text-xs opacity-70 break-all">
									{dbError}
								</p>
							)}
						</div>
					)}
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								disabled={formDisabled}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<Link
									href="/recover"
									className="text-sm text-muted-foreground hover:text-primary"
								>
									Forgot password?
								</Link>
							</div>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
								disabled={formDisabled}
							/>
						</div>
						<Button type="submit" className="w-full" disabled={formDisabled}>
							{isLoading ? "Signing in..." : "Sign In"}
						</Button>
						<div className="text-center text-sm text-muted-foreground">
							Don't have an account?{" "}
							<Link href="/sign-up" className="text-primary hover:underline">
								Sign up
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
