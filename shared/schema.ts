
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export enum BlogPostStatus {
  DRAFT = "DRAFT",
  GENERATING = "GENERATING",
  PUBLISHED = "PUBLISHED",
  SCHEDULED = "SCHEDULED",
}

export const blogPosts = sqliteTable("blog_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title"),
  content: text("content"),
  description: text("description"),
  contextDescription: text("context_description"),
  status: text("status").$type<BlogPostStatus>(),
  keywords: text("keywords", { mode: "json" }).$type<string[]>(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  scheduledDate: text("scheduled_date").default(sql`CURRENT_TIMESTAMP`),
  introLength: integer("intro_length").default(500),
  sectionLength: integer("section_length").default(800),
  conclusionLength: integer("conclusion_length").default(400),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
