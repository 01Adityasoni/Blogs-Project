require("dotenv/config");
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

module.exports = db;