require("dotenv/config");
const { defineConfig } = require("drizzle-kit");
const { normalizeDatabaseUrl } = require("./db/connection");

module.exports = defineConfig({
  schema: [
    "./models/user.js",
    "./models/blogs.js",
    "./models/comment.js",
  ],

  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL),
  },
});