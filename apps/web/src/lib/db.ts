import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

// Lazy database connection - only connects when first used
// This allows the app to build without DATABASE_URL
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Vercel env values sometimes contain accidental whitespace or literal "\n".
  const databaseUrl = process.env.DATABASE_URL.replace(/\\n/g, "").replace(/\\r/g, "").trim();
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  // Idle clients can be dropped by the server; without a listener pg re-emits
  // that as an unhandled 'error' event.
  pool.on("error", (err) => console.error("Postgres pool error:", err.message));
  return drizzle(pool, { schema });
}

// Cache the db instance
let _db: ReturnType<typeof getDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    if (!_db) {
      _db = getDb();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_db as any)[prop];
  },
});
