import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
// Idle clients can be dropped by the server (restart, network blip); without a
// listener pg re-emits that as an unhandled 'error' and the process exits.
pool.on("error", (err) => console.error("Postgres pool error:", err.message));

export const db = drizzle(pool, { schema });
