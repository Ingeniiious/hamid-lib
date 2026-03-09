import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/database/schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

/**
 * Creates a parameterized IN-list from a JS array for use in raw SQL.
 * Drizzle's sql`` template passes arrays as single params which Postgres
 * can't cast to array types. This creates individual $1, $2, ... params.
 *
 * Usage: sql`WHERE col IN (${sqlInList(values)})`
 */
export function sqlInList(values: (string | number)[]) {
  return sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  );
}
