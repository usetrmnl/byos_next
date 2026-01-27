"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

export default function RecoverPage() {
	return (
		<Suspense>
			<RecoverPageContent />
		</Suspense>
	);
}

function RecoverPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const error = searchParams.get("error");

	const [email, setEmail] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Check if there's an error from the email link
	useEffect(() => {
		if (error === "INVALID_TOKEN") {
			setErrorMessage(
				"The reset link is invalid or has expired. Please request a new one.",
			);
		}
	}, [error]);

	const handleRequestReset = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");
		setIsLoading(true);

		try {
			// @ts-expect-error - forgetPassword method exists but types may not be updated
			const { error: requestError } = await authClient.forgetPassword({
				email,
				redirectTo: `${window.location.origin}/recover`,
			});

			if (requestError) {
				setErrorMessage(
					requestError.message ||
						"Failed to send reset email. Please try again.",
				);
				setIsLoading(false);
				return;
			}

			setSuccessMessage(
				"If an account exists with this email, you will receive a password reset link shortly.",
			);
			setIsLoading(false);
		} catch (_err) {
			setErrorMessage("An unexpected error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		// Validate passwords match
		if (newPassword !== confirmPassword) {
			setErrorMessage("Passwords do not match");
			return;
		}

		// Validate password strength
		if (newPassword.length < 8) {
			setErrorMessage("Password must be at least 8 characters long");
			return;
		}

		if (!token) {
			setErrorMessage("Invalid reset token");
			return;
		}

		setIsLoading(true);

		try {
			const { error: resetError } = await authClient.resetPassword({
				newPassword,
				token,
			});

			if (resetError) {
				setErrorMessage(
					resetError.message || "Failed to reset password. Please try again.",
				);
				setIsLoading(false);
				return;
			}

			setSuccessMessage(
				"Your password has been reset successfully. Redirecting to sign in...",
			);
			setTimeout(() => {
				router.push("/sign-in");
			}, 2000);
		} catch (_err) {
			setErrorMessage("An unexpected error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	// Show reset password form if token is present
	if (token && error !== "INVALID_TOKEN") {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-2xl">Reset Password</CardTitle>
						<CardDescription>Enter your new password below</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleResetPassword} className="space-y-4">
							{errorMessage && (
								<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
									{errorMessage}
								</div>
							)}
							{successMessage && (
								<div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
									{successMessage}
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="newPassword">New Password</Label>
								<Input
									id="newPassword"
									type="password"
									placeholder="••••••••"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									autoComplete="new-password"
									disabled={isLoading}
								/>
								<p className="text-xs text-muted-foreground">
									Must be at least 8 characters long
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm New Password</Label>
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
								{isLoading ? "Resetting..." : "Reset Password"}
							</Button>
							<div className="text-center text-sm text-muted-foreground">
								Remember your password?{" "}
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

	// Show request reset form by default
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Recover Password</CardTitle>
					<CardDescription>
						Enter your email address and we'll send you a link to reset your
						password
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleRequestReset} className="space-y-4">
						{errorMessage && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{errorMessage}
							</div>
						)}
						{successMessage && (
							<div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
								{successMessage}
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
								disabled={isLoading}
							/>
						</div>
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "Sending..." : "Send Reset Link"}
						</Button>
						<div className="text-center text-sm text-muted-foreground">
							Remember your password?{" "}
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
