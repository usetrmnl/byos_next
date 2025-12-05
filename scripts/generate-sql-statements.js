#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const migrationsDir = path.join(__dirname, "../migrations");
const outputFile = path.join(__dirname, "../lib/database/sql-statements.ts");

function parseMigrationFile(content, fileName) {
	const titleMatch = content.match(/--\s*Title:\s*(.+)/i);
	const title = titleMatch
		? titleMatch[1].trim()
		: fileName.replace(/\.sql$/, "");

	const descriptionMatch = content.match(/--\s*Description:\s*(.+)/i);
	const description = descriptionMatch
		? descriptionMatch[1].trim()
		: `Migration: ${fileName}`;

	const sql = content
		.replace(/--\s*Title:\s*.+/i, "")
		.replace(/--\s*Description:\s*.+/i, "")
		.trim();

	return { title, description, sql };
}

function extractTableNames(sql) {
	const tableNames = new Set();

	// Match CREATE TABLE statements (with or without IF NOT EXISTS)
	// Handles both "CREATE TABLE table_name" and "CREATE TABLE IF NOT EXISTS table_name"
	// Also handles "CREATE TABLE public.table_name" and "CREATE TABLE IF NOT EXISTS public.table_name"
	const createTableRegex =
		/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
	let match = createTableRegex.exec(sql);

	while (match !== null) {
		const tableName = match[1];
		if (tableName) {
			tableNames.add(tableName);
		}
		match = createTableRegex.exec(sql);
	}

	return Array.from(tableNames);
}

try {
	// Read all SQL files from migrations directory
	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	if (files.length === 0) {
		console.warn("⚠️  No migration files found in", migrationsDir);
		process.exit(1);
	}

	// Parse each migration file and extract table names
	const migrations = {};
	const allTableNames = new Set();

	for (const file of files) {
		const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
		const key = file.replace(/\.sql$/, "").replace(/[-\s]/g, "_");
		const parsed = parseMigrationFile(content, file);
		migrations[key] = parsed;

		// Extract table names from this migration
		const tables = extractTableNames(parsed.sql);
		tables.forEach((table) => {
			allTableNames.add(table);
		});
	}

	// Generate validation query - simple query that returns missing tables
	const tableNamesArray = Array.from(allTableNames).sort();
	const validationQuery = `-- Check for missing required tables
-- Returns empty result if all tables exist, or rows with missing table names if any are missing
SELECT 
  expected_table as missing_table
FROM unnest(ARRAY[${tableNamesArray
		.map((t) => `'${t}'`)
		.join(", ")}]::text[]) as expected_table
WHERE NOT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name = expected_table
);`;

	// Generate TypeScript code
	const output = `// This file is auto-generated from migration files.
// Do not edit manually. Run 'pnpm generate:sql' to regenerate.

export const SQL_STATEMENTS = {
${Object.entries(migrations)
	.map(
		([key, { title, description, sql }]) => `\t"${key}": {
\t\ttitle: "${title.replace(/"/g, '\\"')}",
\t\tdescription: "${description.replace(/"/g, '\\"')}",
\t\tsql: \`${sql.replace(/`/g, "\\`")}\`,
\t}`,
	)
	.join(",\n")},
\t"validate_schema": {
\t\ttitle: "Validate Database Schema",
\t\tdescription: "Validates that all required tables exist in the public schema. Returns list of tables with their status and identifies any missing tables.",
\t\tsql: \`${validationQuery.replace(/`/g, "\\`")}\`,
\t}
};
`;

	// Write the output file
	fs.writeFileSync(outputFile, output);

	console.log(
		`✅ Generated ${
			Object.keys(migrations).length
		} SQL statements from migrations`,
	);
	console.log(`   Output: ${path.relative(process.cwd(), outputFile)}`);
	console.log(
		`   Migrations: ${files.map((f) => f.replace(/\.sql$/, "")).join(", ")}`,
	);
} catch (error) {
	console.error("❌ Error generating SQL statements:", error.message);
	process.exit(1);
}
