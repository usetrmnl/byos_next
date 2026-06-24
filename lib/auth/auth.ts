import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";
import { sendEmail } from "@/lib/email";
import { getAppBaseUrl } from "../utils";

const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";
const BYOS_MONO_USER_ID = "byos_mono_user";
// Arbitrary, app-wide-unique advisory lock id used only to serialize first-admin
// promotion across concurrent sign-ups. The two ints are not persisted; they
// just need to stay unique among any advisory locks this app takes.
const FIRST_ADMIN_LOCK_NAMESPACE = 20260623;
const FIRST_ADMIN_LOCK_KEY = 1;

function createAuth() {
	if (!AUTH_ENABLED) {
		return null;
	}

	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
	});

	async function promoteFirstRealUserToAdmin(userId: string) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
				FIRST_ADMIN_LOCK_NAMESPACE,
				FIRST_ADMIN_LOCK_KEY,
			]);
			const existingAdmin = await client.query<{ exists: boolean }>(
				'SELECT EXISTS (SELECT 1 FROM "user" WHERE role = $1 AND id <> $2) AS exists',
				["admin", BYOS_MONO_USER_ID],
			);

			if (!existingAdmin.rows[0]?.exists) {
				await client.query('UPDATE "user" SET role = $1 WHERE id = $2', [
					"admin",
					userId,
				]);
			}
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK").catch(() => undefined);
			// Best-effort: a failed promotion must not break account creation. The
			// instance stays in admin-bootstrap mode (no admin yet), so the next
			// sign-up retries the promotion.
			console.error("[auth] Failed to promote first user to admin:", error);
		} finally {
			client.release();
		}
	}

	return betterAuth({
		baseURL: getAppBaseUrl().toString(),
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
					after: async (user: { id: string }) => {
						await promoteFirstRealUserToAdmin(user.id);
					},
				},
			},
		},
	});
}

export const auth = createAuth();
