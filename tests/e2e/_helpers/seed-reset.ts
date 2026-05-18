import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_SQL_PATH = resolve(HERE, "..", "seed.sql");

const DEFAULT_DATABASE_URL =
  "postgresql://abridgeai:abridgeai@localhost:5433/abridgeai";

const TRUNCATE_TABLES: ReadonlyArray<string> = [
  "course_enrollments",
  "lesson_resources",
  "lessons",
  "modules",
  "courses",
  "user_role_assignments",
  "organization_memberships",
  "user_profiles",
  "auth_sessions",
  "users",
  "organization_memberships",
  "organizations",
];

export async function resetSeed(): Promise<void> {
  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL?.replace(/^postgresql\+psycopg:\/\//, "postgresql://") ??
    DEFAULT_DATABASE_URL;

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `TRUNCATE TABLE ${TRUNCATE_TABLES.join(", ")} RESTART IDENTITY CASCADE;`,
    );
    await client.query("COMMIT");

    const sql = await readFile(SEED_SQL_PATH, "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
}
