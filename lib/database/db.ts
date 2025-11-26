import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./db.d";

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
	console.warn("DATABASE_URL is not set. Database connection may fail.");
}

// Create a new Kysely instance with Postgres dialect
export const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: process.env.DATABASE_URL?.includes("sslmode=disable")
				? false
				: process.env.NODE_ENV === "production"
					? { rejectUnauthorized: false }
					: false,
		}),
	}),
});
