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

  // Parse each migration file
  const migrations = {};
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const key = file.replace(/\.sql$/, "").replace(/[-\s]/g, "_");
    migrations[key] = parseMigrationFile(content, file);
  }

  // Generate TypeScript code
  const output = `// This file is auto-generated from migration files.
// Do not edit manually. Run 'pnpm generate:sql' to regenerate.
// Generated at: ${new Date().toISOString()}

export const SQL_STATEMENTS = {
${Object.entries(migrations)
  .map(
    ([key, { title, description, sql }]) => `\t"${key}": {
\t\ttitle: "${title.replace(/"/g, '\\"')}",
\t\tdescription: "${description.replace(/"/g, '\\"')}",
\t\tsql: \`${sql.replace(/`/g, "\\`")}\`,
\t}`
  )
  .join(",\n")}
};
`;

  // Write the output file
  fs.writeFileSync(outputFile, output);

  console.log(
    `✅ Generated ${
      Object.keys(migrations).length
    } SQL statements from migrations`
  );
  console.log(`   Output: ${path.relative(process.cwd(), outputFile)}`);
  console.log(
    `   Migrations: ${files.map((f) => f.replace(/\.sql$/, "")).join(", ")}`
  );
} catch (error) {
  console.error("❌ Error generating SQL statements:", error.message);
  process.exit(1);
}
