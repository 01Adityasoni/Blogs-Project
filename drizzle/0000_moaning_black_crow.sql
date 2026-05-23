CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "users" (
	"full_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"salt" varchar,
	"password" varchar NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"profile_image_url" varchar DEFAULT '/user avatar img.png' NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"title" varchar NOT NULL,
	"body" varchar NOT NULL,
	"cover_image_url" varchar DEFAULT '/blog cover img.png',
	"created_by" varchar NOT NULL,
	"timestamp" varchar DEFAULT '2026-05-23T12:39:53.746Z' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"content" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"blog_title" varchar NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_created_by_users_email_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_created_by_users_email_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;