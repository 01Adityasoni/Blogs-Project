const { pgTable, varchar } = require("drizzle-orm/pg-core");
const { users } = require("./user");

const blogs = pgTable("blogs", {
	title: varchar("title").notNull(),
    body: varchar("body").notNull(),
    coverImageURL: varchar("cover_image_url").default("/blog cover img.png"),
    createdBy: varchar("created_by").notNull().references(() => users.email),
    timestamp: varchar("timestamp").notNull().default(new Date().toISOString()),
});

module.exports = {
	blogs,
};
