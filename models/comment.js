const { pgTable, varchar, timestamp } = require("drizzle-orm/pg-core");
const { users } = require("./user");
const { blogs } = require("./blogs");

const comments = pgTable("comments", {
	content: varchar("content").notNull(),
	createdBy: varchar("created_by").notNull().references(() => users.email),
	// store blogTitle as plain text (no foreign key) because blogs.title is not unique in the schema
	blogTitle: varchar("blog_title").notNull(),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
});

module.exports = {
	comments,
};

