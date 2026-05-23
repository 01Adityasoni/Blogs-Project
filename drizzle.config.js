require("dotenv/config");
const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: [
    "./models/user.js",
    "./models/blogs.js",
    "./models/comment.js",
  ],

  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});