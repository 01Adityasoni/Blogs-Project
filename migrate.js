require("dotenv/config");

const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");
const { normalizeDatabaseUrl } = require("./db/connection");

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
});

const db = drizzle(pool);

async function main() {
  console.log("Running migrations...");

  await migrate(db, {
    migrationsFolder: "./drizzle",
  });

  console.log("Migrations completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});