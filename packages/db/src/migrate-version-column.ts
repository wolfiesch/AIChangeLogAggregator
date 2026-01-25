import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Migrating version column from varchar(50) to varchar(255)...");
  await sql`ALTER TABLE changelog_entries ALTER COLUMN version TYPE varchar(255)`;
  console.log("Migration successful!");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
