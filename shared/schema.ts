import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords").array().notNull(),
  affiliateLinks: jsonb("affiliate_links").$type<{name: string, url: string}[]>().notNull().default([]),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  excerpt: text("excerpt"),
  slug: text("slug"),
  metaTags: text("meta_tags").array(),
  headings: jsonb("headings").$type<{level: number, text: string}[]>().notNull().default([]),
  contextDescription: text("context_description"), // New field for blog context
  introLength: integer("intro_length"), // Word count for introduction
  sectionLength: integer("section_length"), // Word count for each main section
  conclusionLength: integer("conclusion_length"), // Word count for conclusion
});

export const insertBlogPostSchema = createInsertSchema(blogPosts)
  .omit({ id: true })
  .extend({
    keywords: z.array(z.string().min(1, "Keyword cannot be empty")),
    affiliateLinks: z.array(z.object({
      name: z.string().min(1, "Link name is required"),
      url: z.string().url("Invalid URL").or(z.string().length(0))
    })).default([]),
    scheduledDate: z.coerce.date(),
    metaTags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
    slug: z.string().optional(),
    contextDescription: z.string().min(1, "Please provide context for the blog post").max(500, "Context description is too long"),
    introLength: z.number().min(100).max(1000).default(400),
    sectionLength: z.number().min(200).max(2000).default(600),
    conclusionLength: z.number().min(100).max(1000).default(300),
  });

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;