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

export default function SignUpPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		// Validate passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		// Validate password strength
		if (password.length < 8) {
			setError("Password must be at least 8 characters long");
			return;
		}

		setIsLoading(true);

		try {
			const { data, error: authError } = await authClient.signUp.email({
				email,
				password,
				name,
			});

			if (authError) {
				setError(authError.message || "Failed to sign up. Please try again.");
				setIsLoading(false);
				return;
			}

			if (data) {
				// Redirect to home page on successful sign up
				router.push("/");
				router.refresh();
			}
		} catch (_err) {
			setError("An unexpected error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Create Account</CardTitle>
					<CardDescription>
						Enter your information to create a new account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								placeholder="John Doe"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								autoComplete="name"
								disabled={isLoading}
							/>
						</div>
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
								disabled={isLoading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="new-password"
								disabled={isLoading}
							/>
							<p className="text-xs text-muted-foreground">
								Must be at least 8 characters long
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								autoComplete="new-password"
								disabled={isLoading}
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Creating account..." : "Create Account"}
						</Button>
						<div className="text-center text-sm text-muted-foreground">
							Already have an account?{" "}
							<Link href="/sign-in" className="text-primary hover:underline">
								Sign in
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
