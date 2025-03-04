import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords").array().notNull(),
  affiliateLinks: jsonb("affiliate_links").$type<{name: string, url: string}[]>().notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  headings: jsonb("headings").$type<{level: number, text: string}[]>().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts)
  .omit({ id: true })
  .extend({
    keywords: z.array(z.string().min(1, "Keyword cannot be empty")),
    affiliateLinks: z.array(z.object({
      name: z.string().min(1, "Name is required"),
      url: z.string().url("Invalid URL")
    })),
    scheduledDate: z.coerce.date(),
  });

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export const csvUploadSchema = z.object({
  keywords: z.string(),
  affiliateName: z.string(),
  affiliateUrl: z.string().url(),
  scheduledDate: z.string(),
});
