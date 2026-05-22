require("dotenv/config");
const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
    schema: "./models",
    out: "./drizzle",
    dialect: "postgres",
    driver: "pg",
    dbCredentials: {
        connectionString: process.env.DATABASE_URL,
    },
});