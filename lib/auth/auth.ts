import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";
import { sendEmail } from "@/lib/email";

const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

function createAuth() {
	if (!AUTH_ENABLED) {
		return null;
	}

	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
	});

	const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

	return betterAuth({
		database: pool,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({
				user,
				url,
			}: {
				user: { email: string };
				url: string;
			}) => {
				await sendEmail({
					to: user.email,
					subject: "Reset your password",
					text: `Click the link to reset your password: ${url}`,
					html: `
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
						<h2>Reset Your Password</h2>
						<p>You requested to reset your password. Click the button below to continue:</p>
						<a href="${url}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
							Reset Password
						</a>
						<p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
						<p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
					</div>
				`,
				});
			},
		},
		plugins: [
			admin({
				defaultRole: "user",
				adminRoles: ["admin"],
			}),
		],
		databaseHooks: {
			user: {
				create: {
					before: async (user: { email: string; role?: string }) => {
						// Auto-assign admin role if email matches ADMIN_EMAIL
						if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) {
							return {
								data: {
									...user,
									role: "admin",
								},
							};
						}
						return { data: user };
					},
				},
			},
		},
	});
}

export const auth = createAuth();
