const { pgTable, varchar, timestamp, pgEnum } = require("drizzle-orm/pg-core")
const roleEnum = pgEnum("role", ["user", "admin"])

const users = pgTable("users", {
    fullName : varchar("full_name").notNull(),
    email : varchar("email").notNull().unique(),
    salt : varchar("salt"),
    password : varchar("password").notNull(),
    timestamp : timestamp("timestamp").notNull().defaultNow(),
    profileImageURL: varchar("profile_image_url").notNull().default("/user avatar img.png"),
    role : roleEnum("role").notNull().default("user"),

})

module.exports = {
    users,
    roleEnum
}