require("dotenv/config");
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");
const { normalizeDatabaseUrl } = require("./connection");

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
	connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
});

const db = drizzle(pool);

module.exports = db;